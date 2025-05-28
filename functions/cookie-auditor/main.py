import os
from datetime import datetime, timezone
import json
import logging
import requests
import sentry_sdk
from sentry_sdk import set_tag
from sentry_sdk.integrations.serverless import serverless_function
from google.cloud import storage
from collections import defaultdict

SENTRY_DSN = os.environ.get("SENTRY_DSN")
AGGREGATE_REPORTS_BUCKET = os.environ.get("AGGREGATE_REPORTS_BUCKET")
LOG_DESTINATION = os.environ.get("LOG_DESTINATION")

UNKNOWN_COOKIES_TEMPLATE = {
    "cookies": {},
    "fb_pixel_events": {},
    "key_logging": {},
    "session_recorders": {},
    "third_party_trackers": {},
}

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )


def identify_unknow_cookies(known_cookies, cookie_found):
    unknown_cookies = {}
    for category, category_data in cookie_found.items():
        if category:
            for key in category_data:
                if key not in known_cookies[category]:
                    if category not in unknown_cookies:
                        unknown_cookies[category] = {}
                    unknown_cookies[category][key] = category_data[key]
    return unknown_cookies


# Forward logs to SIEM webhook
def log_forwarding(data):
    if LOG_DESTINATION:
        headers = {
            "Authorization": f"Bearer {os.environ['LOG_FORWARDING_AUTH_TOKEN']}",
            "Content-Type": "application/json",
        }
        response = requests.post(
            LOG_DESTINATION, json=data, headers=headers, timeout=10
        )

        # Check the response
        if response.status_code == 200 or response.status_code == 204:
            print("Logs forwarded successfully")
        else:
            logging.error("Failed to forward logs. Status code:", response.status_code)
            logging.error("Response content:", response.content)


def combine_reports(bucket_name):
    folder_name = datetime.now(timezone.utc).strftime("%Y%m%d")

    reports, failed_pages = retrieve_reports_from_bucket(bucket_name, folder_name)
    reports = merge_dicts(reports)
    # de-duplicate failed pages
    failed_pages = list(dict.fromkeys(failed_pages))

    return reports, failed_pages


def retrieve_reports_from_bucket(bucket_name, folder_name):
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blobs = bucket.list_blobs(prefix=folder_name)
    total_blobs = bucket.get_blob_count(prefix=folder_name)
    expected_report_count, report_count = 0, 0
    reports, failed_pages = [], []
    if not blobs:
        alert_message = {
            "status": "alert",
            "message": "No reports found in the bucket",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        log_forwarding(alert_message)
        logging.error(alert_message)

        exit()

    for blob in blobs:
        # Parse the JSON string into a dictionary
        report_data = json.loads(blob.download_as_string().decode("utf-8"))
        reports.append(json.loads(report_data["result"]))
        expected_report_count = report_data["metadata"]["total_chunks"]
        report_count += 1
        if "failed_pages" in report_data:
            failed_pages.extend(report_data["failed_pages"])
    if report_count != expected_report_count:
        alert_message = {
            "status": "alert",
            "message": f"{expected_report_count - report_count} report(s) missing",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        log_forwarding(alert_message)
        logging.error(alert_message)
    else:
        print("All reports found: ", report_count)
        logging.info("All reports found: ", report_count)
    return reports, failed_pages


def merge_dicts(list_of_dicts):
    merged = defaultdict(lambda: defaultdict(list))

    for dict in list_of_dicts:
        if dict:
            for category, category_data in dict.items():
                if category:
                    for key, links in category_data.items():
                        merged[category][key].extend(links)

    # Convert back to a normal dictionary and remove duplicates in lists
    return {
        category: {key: list(set(links)) for key, links in sub_dict.items()}
        for category, sub_dict in merged.items()
    }


@serverless_function
def main(request):
    # import approved cookies from json file
    known_cookies = json.load(open("known_cookies.json"))
    print(f"known_cookies: {known_cookies}")

    scan_result, failed_pages = combine_reports(AGGREGATE_REPORTS_BUCKET)
    print(f"scan_result: {scan_result}")

    # # compare found cookies and approved cookies
    unknown_cookies = identify_unknow_cookies(known_cookies, scan_result)
    print(f"unknown_cookies: {unknown_cookies}")

    if failed_pages:
        error_message = {
            "status": "error",
            "message": "failed pages",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {
                "failed_pages": failed_pages,
            }
        }
        logging.error(error_message)

    if unknown_cookies:
        alert_message = {
            "status": "alert",
            "message": "unknown cookie found",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": unknown_cookies,
        }
        log_forwarding(alert_message)
        return alert_message
    else:
        success_message = {
            "status": "success",  # required, string
            "message": "scan completed, no unknown cookie found",  # required, string
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": scan_result,
        }
        log_forwarding(success_message)
        print("**** No Unknown Cookie****")
        return success_message


if __name__ == "__main__":
    main()
