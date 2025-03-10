# load the folders under `pubsub` and locate the terraform.yaml files
locals {
  terraform_files   = fileset(path.module, "*/terraform.yaml")
  terraform_configs = [for f in local.terraform_files : yamldecode(file("${path.module}/${f}"))]
}

variable "project_id" {}
variable "project" {}
variable "region" {}
variable "deploy_sa_email" {}
variable "bucket_location" {}
variable "zone" {}
variable "owner" {}

module "gcs" {
  source   = "../modules/gcs"
  for_each = { for config in local.terraform_configs : config.name => config if contains(keys(config), "gcs") }

  bucket_name                  = each.value.gcs.bucket_name
  project_id                   = var.project_id
  gcp_region                   = var.region
  service_account_id           = each.value.gcs.service_account_id
  service_account_display_name = each.value.gcs.service_account_display_name
  owner                        = var.owner
  cloud_functions_read         = lookup(each.value, "cloud_functions_read", [])
  cloud_functions_write        = lookup(each.value, "cloud_functions_write", [])
}
