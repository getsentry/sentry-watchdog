# Create a topic
resource "google_pubsub_topic" "topic" {
  name = var.topic_name
  labels = {
    owner = var.owner
    terraformed = "true"
  }

  message_retention_duration = "604800s" # 7 days (maximum)
  message_storage_policy {
    allowed_persistence_regions = [var.gcp_region]
  }
}

# Create a subscription for the topic
resource "google_pubsub_subscription" "subscription" {
  name                       = var.subscription_id
  topic                      = google_pubsub_topic.topic.name
  message_retention_duration = "604800s" # 7 days. (default)
  retain_acked_messages      = false     # Remove acknowledged messages (default)
  ack_deadline_seconds       = 600       # maximum
  enable_message_ordering    = false     # default
  labels = {
    owner = var.owner
    terraformed = "true"
  }

  dynamic "expiration_policy" {
    for_each = var.ttl != null ? [1] : []
    content {
      ttl = var.ttl
    }
  }
  # Retry policies set the minimum and/or maximum delay between consecutive deliveries of a given message
  retry_policy {
    minimum_backoff = "10s" # default
  }
}

resource "google_service_account" "pubsub_service_account" {
  account_id   = var.service_account_id
  display_name = var.service_account_display_name
  description = "Service account for ${var.topic_name}, owned by ${var.owner}, managed by Terraform"
}

# Pub/Sub Viewer
resource "google_pubsub_subscription_iam_member" "viewer" {
  subscription = google_pubsub_subscription.subscription.name
  role         = "roles/pubsub.viewer"
  member       = "serviceAccount:${google_service_account.pubsub_service_account.email}"
}

# Pub/Sub Subscriber
resource "google_pubsub_subscription_iam_member" "subscriber" {
  subscription = google_pubsub_subscription.subscription.name
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_service_account.pubsub_service_account.email}"
}

# Monitoring Viewer
resource "google_project_iam_member" "project" {
  project = var.project_id
  role    = "roles/monitoring.viewer"
  member  = "serviceAccount:${google_service_account.pubsub_service_account.email}"
}
