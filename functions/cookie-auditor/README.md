# Cookie Auditor
The cookie auditor will collect the scanner result from [cookie-scanner](../cookie-scanner/), aggregate all the reports from different batch, and compare them to the predefined [known_cookies.json](./known_cookies.json). 

If any cookies and/or trackers that are not in the known cookies list is found, it will send an alert to the log destination.

## Input
An aggregated scan result for all the page scanned will be saved with the following format to the GCS bucket under the folder of the date the script ran.

```json
{
    "metadata": {
        "title": "Sentry Cookie Scanner",
        "date": "20250313/",
        "chunk_no": 1,
        "total_chunks": 29,
        "total_pages": 3480
    },
    "result": {
        "cookies": {
            "_GRECAPTCHA/www.google.com": [
                "https://blog.sentry.io/profiling-to-speed-up-your-apps/"
            ],
            "sentry-sc/sentry.io": [
                "https://sentry.io/changelog/slack-threads-for-issue-alerts",
                "https://sentry.io/changelog/stack-trace-local-variable-enhancements"
            ]
        },
        "fb_pixel_events": {},
        "key_logging": {},
        "session_recorders": {},
        "third_party_trackers": {
            "||plausible.io^$third-party": [
                "https://sentry.zendesk.com/hc/en-us/articles/21028096175259-Why-are-my-Alerts-not-Triggering-Understanding-When-conditions",
                "https://sentry.zendesk.com/hc/en-us/sections/26094954188059-Notifications"
            ],
            "||googletagmanager.com^": [
                "https://blog.sentry.io/a-new-era-of-sentry/",
                "https://blog.sentry.io/authors/johnny-bell/"
            ]
        }
    },
    "failed_pages":[
        // this item only exisit if scan failure happens
        "https://example1.com",
        "https://example2.com"
    ]
}
```

## Output
If unknown cookies and/or trackers are found, the following message will be send to the logging destination you set up.

```json
{
    "status": "alert",
    "message": "unknown cookie found",
    "timestamp": "2025-03-13T20: 51: 49.279927+00: 00",
    "data": {
        "cookies": {
            "_zendesk_session/sentry.zendesk.com": [
                "https: //sentry.zendesk.com/hc/en-us/articles/27148641479067-Getting-A-server-with-the-specified-hostname-could-not-be-found-error"
            ]
        },
        "third_party_trackers": {
            "/web-vitals/*": [
                "https://sentry.io/for/web-vitals/"
            ]
        }
    }
}
```

If there's any failure in page scan, an error will be send to the logging destination you set up.
```json
{
    "status": "error",
    "message": "failed pages",
    "timestamp": "2025-03-13T20: 51: 49.279927+00: 00",
    "data": {
        "failed_pages":[
            "https://example1.com",
            "https://example2.com"
        ]
    }
}
```

## Logging
If you provide a webhook as logging destination in the [terraform.tfvars](../../terraform.tfvars) file, logs will be forward to the webhook destination. 
Authentication related token for logged is defined in GCP Secret manager, created in terraform [here](../../infrastructure/secrets.tf) and shared with the function in the [terraform.yaml](./terraform.yaml).