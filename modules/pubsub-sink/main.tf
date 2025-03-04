resource "google_storage_bucket" "pubsub-sink-bucket" {
  name                     = var.sink_name
  location                 = var.bucket_location
  force_destroy            = true
  public_access_prevention = "enforced"
  labels = {
    owner = var.owner
    terraformed = "true"
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type = "Delete"
    }
  }
}
