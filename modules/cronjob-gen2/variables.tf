variable "name" {
  type        = string
  description = "Name of the cronjob trigger"
}

variable "description" {
  type        = string
  description = "Description of the cronjob trigger"
}

variable "schedule" {
  type        = string
  description = "Schedule in cron format (* * * * *)"
}

variable "time_zone" {
  type        = string
  description = "Time zone for schedule, default Etc/UTC"
  default     = "Etc/UTC"
}

variable "target_project" {
  type        = string
  description = "Function's project"
}

variable "target_region" {
  type        = string
  description = "Function's location / region (default us-west1)"
  default     = "us-west1"
}

variable "target_function_name" {
  type        = string
  description = "Function name"
}

variable "https_trigger_url" {
  type        = string
  description = "URL of the cloud function to trigger"
}

variable "http_method" {
  type        = string
  description = "HTTP method for the call to make, default GET"
  default     = "GET"
}

variable "attempt_deadline" {
  type        = string
  description = "Deadline for the function to return before job fail, max 1800s or 30m"
  default     = "320s"
}

variable "deploy_sa_email" {
  type        = string
  description = "Service account used for CD in GitHub actions"
}

variable "owner" {
  type        = string
  description = "The owner of the project, used for tagging resources and future ownership tracking"
}
