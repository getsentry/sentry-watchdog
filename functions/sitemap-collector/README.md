# sitemap-collector
We have too many pages that we want to scan on our website and we don't want to crawl our own site, so we decide to utilize the sitemaps from our websites and rss feeds for our blog.

This cloud function will take all the sitemaps, feeds, or pages you provided, pull all the pages from them and put them into one large list. Since this list is quite large (for us, it's 3k+), it's hard for us to use one single cloud function to handle them all, hence we break them down into chunks, size defined in [scanner_config.yaml](./scanner_config.yaml), and send them to GCP pub/sub. Each message in the pub/sub will triggers a [cookie-scanner](../cookie-scanner/) cloud function instance and scans the pages in paralle.


## Input
[scanner_config.yaml](./scanner_config.yaml) and [target.yaml](./target.yaml) are symbolic linked files of [scanner_config.yaml](../../scanner_config.yaml) and [target.yaml](../../target.yaml) in the root folder of the repo. 

These will be the input for this function, for more details reference the [README.md](../../README.md) on the root folder.

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