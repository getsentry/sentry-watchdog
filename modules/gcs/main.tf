resource "google_storage_bucket" "bucket" {
  name                     = var.bucket_name
  location                 = var.gcp_region
  public_access_prevention = "enforced"
  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }
  labels = {
    owner = var.owner
  }
}

resource "google_service_account" "gcs_service_account" {
  account_id   = var.service_account_id
  display_name = var.service_account_display_name
  description  = "Service account for ${var.bucket_name}, owned by ${var.owner}, managed by Terraform"
}

resource "google_storage_bucket_iam_member" "cloud_functions_gcs_read" {
  for_each = toset(var.cloud_functions_read)
  bucket   = google_storage_bucket.bucket.name
  role     = "roles/storage.objectViewer"
  member   = "serviceAccount:cf-${each.value}@${var.project_id}.iam.gserviceaccount.com"
}

resource "google_storage_bucket_iam_member" "cloud_functions_gcs_write" {
  for_each = toset(var.cloud_functions_write)
  bucket   = google_storage_bucket.bucket.name
  role     = "roles/storage.objectUser"
  member   = "serviceAccount:cf-${each.value}@${var.project_id}.iam.gserviceaccount.com"
}
