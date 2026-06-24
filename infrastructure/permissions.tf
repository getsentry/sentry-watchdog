# Project-wide roles
locals {
  roles = [
    "roles/viewer",                         # general read-only access to most Google Cloud resources
    "roles/storage.admin",                  # full access to manage GCS buckets and objects
    "roles/secretmanager.secretAccessor",   # access to Secret Manager
    "roles/cloudfunctions.developer",       # deploy and manage Cloud Functions
    "roles/logging.viewer",                 # view logs
    "roles/logging.logWriter",              # write build logs when Cloud Build builds functions
    "roles/artifactregistry.writer",        # push function container images to Artifact Registry
    "roles/iam.serviceAccountUser",         # necessary to invoke Cloud Functions
    "roles/iam.workloadIdentityPoolViewer", # view workload identity pool
    "roles/iam.serviceAccountCreator",      # create service accounts
    "roles/pubsub.admin",                   # full access to Pub/Sub
  ]
}

resource "google_project_iam_member" "project_roles" {
  for_each = toset(local.roles)
  project  = var.project
  role     = each.value
  member   = "serviceAccount:${var.deploy_sa_email != null ? var.deploy_sa_email : google_service_account.gha_cloud_functions_deployment[0].email}"

}
