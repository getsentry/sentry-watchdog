# This script is for local run that allows you to pull reports for a specific date and compare it with the known cookies
# You will need to auth to GCP with `gcloud auth application-default login` with the account that has access to the GCS bucket

from datetime import datetime, timezone
import json
import logging
from google.cloud import storage
from collections import defaultdict


AGGREGATE_REPORTS_BUCKET = "aggregated-reports-storage"

# Update this to the date of the report you want to pull from GCS
TARGET_FOLDER = "20250428"

UNKNOWN_COOKIES_TEMPLATE = {
    "cookies": {},
    "fb_pixel_events": {},
    "key_logging": {},
    "session_recorders": {},
    "third_party_trackers": {},
}


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


def combine_reports(bucket_name):
    folder_name = TARGET_FOLDER

    reports, failed_pages = retrieve_reports_from_bucket(bucket_name, folder_name)

    reports = merge_dicts(reports)
    # de-duplicate failed pages
    failed_pages = list(dict.fromkeys(failed_pages))
    
    # # save to file
    # with open("combined_reports.json", "w") as f:
    #     json.dump(reports, f)

    return reports, failed_pages


def retrieve_reports_from_bucket(bucket_name, folder_name):
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blobs = bucket.list_blobs(prefix=folder_name)
    expected_report_count, report_count = 0, 0
    reports, failed_pages = [], []
    if not blobs:
        alert_message = {
            "status": "alert",
            "message": "No reports found in the bucket",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
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


def main():
    # import approved cookies from json file
    known_cookies = json.load(open("known_cookies.json"))
    # print(f"known_cookies: {known_cookies}")

    scan_result, failed_pages = combine_reports(AGGREGATE_REPORTS_BUCKET)
    # print(f"scan_result: {scan_result}")
    with open("scan_result.json", "w") as f:
        json.dump(scan_result, f)

    # # compare found cookies and approved cookies
    unknown_cookies = identify_unknow_cookies(known_cookies, scan_result)
    print(f"unknown_cookies: {unknown_cookies}")

    # save to file
    with open("unknown_cookies.json", "w") as f:
        json.dump(unknown_cookies, f)

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
        logging.error(alert_message)
        return alert_message
    else:
        success_message = {
            "status": "success",  # required, string
            "message": "scan completed, no unknown cookie found",  # required, string
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": scan_result,
        }
        print("**** No Unknown Cookie****")
        return success_message


if __name__ == "__main__":
    main()
