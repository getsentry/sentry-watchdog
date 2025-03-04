
variable "project" {
  type = string
}

variable "secret_ids" {}

variable "name" {
  type        = string
  description = "Name of the cloud function"
}

variable "description" {
  type        = string
  description = "Description for the cloud function"
  default     = null
}

variable "source_dir" {
  type        = string
  description = "Directory containing source code, relative or absolute (relative preferred, think about CI/CD!)"
}

variable "location" {
  type        = string
  description = "The location of this cloud function"
  default     = "us-west1"
}

variable "runtime" {
  type        = string
  description = "Function runtime, default python 3.11"
  default     = "python311"
  nullable    = false
}

variable "source_object_prefix" {
  type        = string
  description = "String prefixing source upload objects"
  default     = "src-"
}

variable "source_upload_bucket" {
  type        = string
  description = "Bucket where source files are uploaded before cloud function deployment"
  default     = "cloud-function-source-staging"
}

variable "function_entrypoint" {
  type        = string
  description = "Entrypoint function on cloud function trigger"
  nullable    = false
  default     = "main"
}

variable "execution_timeout" {
  type        = number
  description = "Amount of time function can execute before timing out, in seconds"
  default     = 60
  nullable    = false
}

variable "available_memory" {
  type        = string
  description = "Amount of memory assigned to each execution"
  default     = "256M"
  nullable    = false
}

variable "temp_zip_output_dir" {
  type        = string
  description = "Dir path where temporary archive will be written"
  default     = "/tmp"
}

variable "deploy_sa_email" {
  type        = string
  description = "Service account used for CD in GitHub actions"
}

variable "environment_variables" {
  type        = map(any)
  description = "Environment variables available to the function"
  default     = null
}

variable "secret_environment_variables" {
  description = "list of secrets to mount as env vars"
  type = list(object({
    key     = string
    secret  = string
    version = string
  }))

  default = []
}

variable "ingress_settings" {
  description = "Available ingress settings. ALLOW_ALL, ALLOW_INTERNAL_ONLY, ALLOW_INTERNAL_AND_GCLB."
  type        = string
  default     = "ALLOW_ALL"

}

variable "files_to_exclude" {
  description = "files to exclude from the "
  type        = list(string)
  default = [
    "terraform.yaml",
    "main.tf",
  ]
}

variable "allow_unauthenticated" {
  type        = bool
  description = "Whether the function is allowed to be called without authentication"
  nullable    = false
  default     = false
}

variable "owner" {
  type        = string
  description = "The owner of the project, used for tagging resources and future ownership tracking"
}
