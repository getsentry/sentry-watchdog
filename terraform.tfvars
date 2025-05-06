## required variables
project         = "sentry-cookie-scanner"
project_id      = "sentry-cookie-scanner"
project_num     = "695686394944"
region          = "us-west1"
zone            = "us-west1-b"
bucket_location = "US-WEST1"


## optional variables

# Owner of the project, used for tagging resources and future ownership tracking in GCP
owner = "team-security"

# Maintainers will have access to impersonate service account to deploy infrastructure
# update the `maintainers` resource in `infrastructure/main.tf` if you are not using a group email
maintainers = ["team-security-2@sentry.io"]

# For error monitoring
# sentry-cookie-scanner project in sentry's sentry https://sentry.sentry.io/projects/sentry-cookie-scanner/
sentry_dsn = "https://39d93e532415311821aaa75fbba3b851@o1.ingest.us.sentry.io/4508955969060864"

# Set the webhook url if you want to forward logs and get alerts on unknown cookies
# manually add any auth for webhook if needed
log_destination = "https://api.runreveal.com/sources/webhook/2w8C4ldut2UHRp8PgZK3DQ6fnCl"
