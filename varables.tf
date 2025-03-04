variable "project" {
  type        = string
  description = "The GCP project ID"
}

variable "region" {
  type        = string
  description = "The GCP region"
}

variable "zone" {
  type        = string
  description = "The GCP zone"
}

variable "project_id" {
  type        = string
  description = "The GCP project ID"
}

variable "project_num" {
  type        = string
  description = "The GCP project number"
}

variable "bucket_location" {
  type        = string
  description = "The location for GCS bucket"
}

variable "tf_state_bucket" {
  type        = string
  description = "The name of the tfstate bucket"
}

variable "deploy_sa_email" {
  type        = string
  description = "service account for deployment"
  default     = null
}

variable "owner" {
  type        = string
  description = "The owner of the project, used for tagging resources and future ownership tracking"
}

# A hack to turn all var in the tfvars file into a variable map
# This will allow us to make these vars available when reading configs from yamls
locals {
  tfvars_content = file("terraform.tfvars")
  # Extract key-value pairs ignoring comments (lines starting with #)
  tfvars_lines = regexall("(?m)^([^#\\n][^=]+)\\s*=\\s*(.*)$", local.tfvars_content)
  # Convert the list of matches into a map
  local_variables = { for pair in local.tfvars_lines : trimspace(pair[0]) => try(jsondecode(pair[1]), trimspace(pair[1])) }
}