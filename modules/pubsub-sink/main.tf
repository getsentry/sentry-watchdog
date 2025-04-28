resource "google_storage_bucket" "pubsub-sink-bucket" {
  name                     = var.sink_name
  location                 = var.bucket_location
  force_destroy            = true
  public_access_prevention = "enforced"
  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }
  
  labels = {
    owner       = var.owner
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
