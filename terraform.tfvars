project         = "sentry-cookie-scanner"
region          = "us-west1"
zone            = "us-west1-b"
project_id      = "sentry-cookie-scanner"
project_num     = "695686394944"
bucket_location = "US-WEST1"
# Owner of the project, used for tagging resources and future ownership tracking in GCP
owner = "team-security"
# sentry-cookie-scanner project in sentry's sentry https://sentry.sentry.io/projects/sentry-cookie-scanner/
sentry_dsn = "https://39d93e532415311821aaa75fbba3b851@o1.ingest.us.sentry.io/4508955969060864"
# set the webhook url if you want to send logs to a webhook
# manually add any auth for webhook if needed
log_destination = "https://api.runreveal.com/sources/webhook/2w8C4ldut2UHRp8PgZK3DQ6fnCl"
