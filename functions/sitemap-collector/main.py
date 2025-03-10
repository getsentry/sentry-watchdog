import os
import yaml
import json
import math
import requests
import xmltodict
import feedparser
from google.cloud import pubsub_v1
from concurrent import futures
from typing import Callable
import sentry_sdk
from sentry_sdk.integrations.gcp import GcpIntegration

sentry_sdk.init(os.environ.get("SENTRY_DSN"))
PROJECT_ID = os.environ.get("PROJECT_ID")
TOPIC_ID = os.environ.get("TOPIC_ID")

PUBLISHER = pubsub_v1.PublisherClient()
TOPIC_PATH = PUBLISHER.topic_path(PROJECT_ID, TOPIC_ID)
PUBLISH_FUTURES = []

sentry_sdk.init(
    dsn="https://39d93e532415311821aaa75fbba3b851@o1.ingest.us.sentry.io/4508955969060864",
    # Add data like request headers and IP for users, if applicable;
    # see https://docs.sentry.io/platforms/python/data-management/data-collected/ for more info
    send_default_pii=True,
    integrations=[
        GcpIntegration(timeout_warning=True),
    ],
    environment="sitemap-collector",
)



def get_pages_from_site(sitemaps):
    pages_to_scan = []
    for sitemap_link in sitemaps:
        sitemap = xmltodict.parse(requests.get(sitemap_link).content)

        for pages in sitemap["urlset"]["url"]:
            pages_to_scan.append(pages["loc"])

    return pages_to_scan


def get_pages_from_feed(feeds):
    pages_to_scan = []
    for feed_link in feeds:
        feed = feedparser.parse(feed_link)
        for entry in feed.entries:
            pages_to_scan.append(entry.link)

    return pages_to_scan


def get_publisher_callback(
    PUBLISH_FUTURES: pubsub_v1.publisher.futures.Future, data: str
) -> Callable[[pubsub_v1.publisher.futures.Future], None]:
    def callback(PUBLISH_FUTURES: pubsub_v1.publisher.futures.Future) -> None:
        try:
            # Wait 60 seconds for the publish call to succeed.
            print(PUBLISH_FUTURES.result(timeout=60))
        except futures.TimeoutError:
            print(f"Publishing {data} timed out.")

    return callback


def main(request):
    # read the sitemap list from target.yaml
    with open("target.yaml", "r") as f:
        target = yaml.safe_load(f)

    with open("scanner_config.yaml", "r") as f:
        scanner_config = yaml.safe_load(f)

    # get a list of all pages to scan
    pages_to_scan = get_pages_from_site(target["sitemaps"])
    pages_to_scan.extend(get_pages_from_feed(target["rss"]))
    pages_to_scan.extend(target["pages"])

    # print the list of pages to scan
    page_count = len(pages_to_scan)

    scanner_config["total_pages"] = page_count
    scanner_config["total_chunks"] = math.ceil(page_count / scanner_config["chunkSize"])
    scanner_config["chunk_no"] = 0
    scanner_config["target"] = []

    # break the list of pages into chunks of 100
    chunks = [
        pages_to_scan[i : i + scanner_config["chunkSize"]]
        for i in range(0, len(pages_to_scan), scanner_config["chunkSize"])
    ]

    for chunk in chunks:
        scanner_config["chunk_no"] += 1
        scanner_config["target"] = chunk

        # publish the chunk to pubsub
        publish_future = PUBLISHER.publish(
            TOPIC_PATH, json.dumps(scanner_config).encode("utf-8")
        )
        # Non-blocking. Publish failures are handled in the callback function.
        publish_future.add_done_callback(
            get_publisher_callback(
                publish_future,
                "Chunk %s of %s"
                % (scanner_config["chunk_no"], scanner_config["total_chunks"]),
            )
        )
        PUBLISH_FUTURES.append(publish_future)

    futures.wait(PUBLISH_FUTURES, return_when=futures.ALL_COMPLETED)

    return "success"


if __name__ == "__main__":
    main(None)

"""
Example format of the message published to pubsub:
{
    "title": "Sentry Cookie Scanner",
    "scanner": {
        "headless": true,
        "numPages": 0,
        "captureHar": false,
        "saveScreenshots": false,
        "emulateDevice": {
            "viewport": {
                "height": 1920,
                "width": 1080
            },
            "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3"
        }
    },
    "maxConcurrent": 30,
    "chunkSize": 500,
    "total_pages": 3275,
    "total_chunks": 7,
    "chunk_no": 1,
    "target": [
        "https://page1.com",
        "https://page2.com",
        "https://page3.com",
        "https://page4.com",
        ...
    ]
}
"""
