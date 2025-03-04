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

module "pubsubs" {
  source   = "../modules/pubsub"
  for_each = { for config in local.terraform_configs : config.name => config if contains(keys(config), "pubsub") }

  topic_name                   = each.value.pubsub.topic_name
  subscription_id              = each.value.pubsub.subscription_id
  project_id                   = var.project_id
  gcp_region                   = var.region
  service_account_id           = each.value.pubsub.service_account_id
  service_account_display_name = each.value.pubsub.service_account_display_name
  ttl                          = lookup(each.value.pubsub, "ttl", null)
  owner                        = var.owner
}

module "pubsubs_sink" {
  source   = "../modules/pubsub-sink"
  for_each = { for config in local.terraform_configs : config.name => config if contains(keys(config), "sink") }

  sink_name       = each.value.sink.sink_name
  bucket_location = var.bucket_location
  project_id      = var.project_id
  gcp_region      = var.region
  owner           = var.owner
}
