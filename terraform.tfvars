project         = "sentry-cookie-scanner"
region          = "us-west1"
zone            = "us-west1-b"
project_id      = "sentry-cookie-scanner"
project_num     = "695686394944"
bucket_location = "US-WEST1"
tf_state_bucket = "sentry-cookie-scanner-infra"
# Owner of the project, used for tagging resources and future ownership tracking
owner = "team-security"

# provide the service account email for deployment if you want to use your own workload identity provider
# if you want to spin up new workload identity pool, set this to null
deploy_sa_email = null
