output "pubsub_subscription_name" {
  value = google_pubsub_subscription.subscription.name
}

output "pubsub_topic_name" {
  value = google_pubsub_topic.topic.name
}

output "service_account_email" {
  value       = google_service_account.pubsub_service_account.email
  description = "Service account email"
  sensitive   = false
}