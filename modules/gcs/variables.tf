variable "bucket_name" {
  type        = string
  description = "GCS bucket name"
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

variable "owner" {
  type        = string
  description = "The owner of the project, used for tagging resources and future ownership tracking"
}

variable "cloud_functions_read" {
  type        = list(string)
  description = "The service accounts of the functions that will be accessing this pub/sub"
}

variable "cloud_functions_write" {
  type        = list(string)
  description = "The service accounts of the functions that will be accessing this pub/sub"
}
