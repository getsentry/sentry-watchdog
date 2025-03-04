variable "topic_name" {
  type        = string
  description = "Pub/Sub topic name"
}

variable "subscription_id" {
  type        = string
  description = "Pub/Sub subscription id"
}

variable "project_id" {
  type        = string
  description = "GCP Project name"
}

variable "gcp_region" {
  type        = string
  description = "GCP Region"
}

variable "service_account_id" {
  type        = string
  description = "Service account id"
}

variable "service_account_display_name" {
  type        = string
  description = "Service account display name"
}

variable "ttl" {
  type        = string
  description = "Pub/Sub topic ttl"
  default     = null
}

variable "owner" {
  type        = string
  description = "The owner of the project, used for tagging resources and future ownership tracking"
}
