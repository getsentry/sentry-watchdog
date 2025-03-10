project         = "sentry-cookie-scanner"
region          = "us-west1"
zone            = "us-west1-b"
project_id      = "sentry-cookie-scanner"
project_num     = "695686394944"
bucket_location = "US-WEST1"
tf_state_bucket = "sentry-cookie-scanner-infra"
sentry_dsn      = "https://39d93e532415311821aaa75fbba3b851@o1.ingest.us.sentry.io/4508955969060864"
# Owner of the project, used for tagging resources and future ownership tracking
owner = "team-security"

# provide the service account email for deployment if you want to use your own workload identity provider
# if you want to spin up new workload identity pool, set this to null
deploy_sa_email = null
