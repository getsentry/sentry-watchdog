resource "google_service_account" "gha_cloud_functions_deployment" {
  count = var.deploy_sa_email != null ? 0 : 1

  account_id   = "gha-cloud-functions-deployment"
  description  = "For use by Terraform and GitHub Actions to deploy cloud-functions, owned by ${var.owner}, managed by Terraform"
  display_name = "gha-cloud-functions-deployment"
  project      = var.project
}

resource "google_storage_bucket" "staging_bucket" {
  name                     = "${var.project}-cloud-function-staging"
  location                 = "US"
  force_destroy            = true
  public_access_prevention = "enforced"
  uniform_bucket_level_access = true
  labels = {
    owner       = var.owner
    terraformed = "true"
  }
}

resource "google_storage_bucket_iam_member" "staging_bucket_get" {
  bucket = google_storage_bucket.staging_bucket.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${var.deploy_sa_email != null ? var.deploy_sa_email : google_service_account.gha_cloud_functions_deployment[0].email}"
}