# sitemap-collector
We have too many pages that we want to scan on our website and we don't want to crawl our own site, so we decide to utilize the sitemaps from our websites and rss feeds for our blog.

This cloud function will take all the sitemaps, feeds, or pages you provided, pull all the pages from them and put them into one large list. Since this list is quite large (for us, it's 3k+), it's hard for us to use one single cloud function to handle them all, hence we break them down into chunks, size defined in [scanner_config.yaml](./scanner_config.yaml), and send them to GCP pub/sub. Each message in the pub/sub will triggers a [cookie-scanner](../cookie-scanner/) cloud function instance and scans the pages in paralle.


## Input
[scanner_config.yaml](./scanner_config.yaml) is the config file for the scanner, it will decide how scanner will scan your page. You can also control how many pages you want to scan simultaneously, how many pages each chunk should have. Default vaules will be used if configs are not provided.

You should adjust them accordingly, depends on how many pages you have and how much resource you want to spend on the cloud function.
```yaml
title: Sentry Cookie Scanner
scanner:
  headless: false
  numPages: 0
  captureHar: false
  saveScreenshots: false
  emulateDevice:
    viewport:
      height: 1920
      width: 1080
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.3"

# Note: pubsub message expires after 10 minutes, so we want to keep each chunk under 10 minutes
maxConcurrent: 40 # number of concurrent scans
chunkSize: 120 # number of pages to scan per chunk
```

[target.yaml](./target.yaml) is a yaml that include sitemaps, rss feeds, or pages that you want to scan. 

```yaml
sitemaps:
  - https://sentry.io/sitemap/sitemap-0.xml
  - https://blog.sentry.io/sitemap/sitemap-0.xml
rss:
  - https://sentry.io/changelog/feed.xml
pages:
  - https://status.sentry.io
  - https://fsl.software
```

## Output
An example input that will be send from pub/sub, which will then trigger the [cookie-scanner](../cookie-scanner/) cloud function.

```json
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
        "https://page4.com"
    ]
}
```

## Logging
If you provide a webhook as logging destination in the [terraform.tfvars](../../terraform.tfvars) file, logs will be forward to the webhook destination. 
Authentication related token for logged is defined in GCP Secret manager, created in terraform [here](../../infrastructure/secrets.tf) and shared with the function in the [terraform.yaml](./terraform.yaml).