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

PROJECT_ID = os.environ.get("PROJECT_ID")
TOPIC_ID = os.environ.get("TOPIC_ID")

PUBLISHER = pubsub_v1.PublisherClient()
TOPIC_PATH = PUBLISHER.topic_path(PROJECT_ID, TOPIC_ID)
PUBLISH_FUTURES = []


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
    chunks = [pages_to_scan[i:i+scanner_config["chunkSize"]] for i in range(0, len(pages_to_scan), scanner_config["chunkSize"])]

    for chunk in chunks:
        scanner_config["chunk_no"] += 1
        scanner_config["target"] = chunk

        # publish the chunk to pubsub
        publish_future = PUBLISHER.publish(TOPIC_PATH, json.dumps(scanner_config).encode("utf-8"))
        # Non-blocking. Publish failures are handled in the callback function.
        publish_future.add_done_callback(get_publisher_callback(publish_future, "Test message"))
        PUBLISH_FUTURES.append(publish_future)

    futures.wait(PUBLISH_FUTURES, return_when=futures.ALL_COMPLETED)



    return True


if __name__ == "__main__":
    main(None)

'''
{
 scanner_config:{
    headless: true
    numPages: 0
    captureHar: false
    saveScreenshots: false
    emulateDevice:
      viewport:
        height: 1920
        width: 1080
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3"
 },
 chunk_no: 1,
 total_chunks: 10,
 chunk_size: 500,
 maxConcurrent: 30,
 target: [
    "https://page1.com",
    "https://page2.com",
    "https://page3.com",
    "https://page4.com",
    ...
 ]
}

'''