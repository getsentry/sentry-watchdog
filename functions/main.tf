# load the folders under `functions` and locate the terraform.yaml files
locals {
  terraform_files   = fileset(path.module, "*/terraform.yaml")
  terraform_configs = [for f in local.terraform_files : yamldecode(file("${path.module}/${f}"))]
}

variable "project_id" {}
variable "project" {}
variable "region" {}
variable "secret_ids" {}
variable "deploy_sa_email" {}
variable "local_variables" {}
variable "owner" {}

module "cloud_function_gen2" {
  source   = "../modules/cloud-function-gen2"
  for_each = { for config in local.terraform_configs : config.name => config if contains(keys(config), "cloud-function-gen2") }

  name                  = each.value.name
  description           = lookup(each.value, "description", null)
  source_dir            = "${path.module}/${each.value.name}"
  runtime               = lookup(each.value.cloud-function-gen2, "runtime", null)
  execution_timeout     = lookup(each.value.cloud-function-gen2, "execution_timeout", null)
  available_memory      = lookup(each.value.cloud-function-gen2, "available_memory", null)
  allow_unauthenticated = lookup(each.value.cloud-function-gen2, "allow_unauthenticated", null)
  function_entrypoint   = lookup(each.value.cloud-function-gen2, "function_entrypoint", null)

  # A hack to allow variables in yamls
  # This will check if value starts with $, and lookup the value from the local_variables map, which is created from terraform.tfvars
  environment_variables = {
    for k, v in lookup(each.value.cloud-function-gen2, "environment_variables", {}) :
    k => (
      length(regexall("^\\$(.+)$", v)) > 0                             # Check if value has $ prefix
      ? lookup(var.local_variables, regexall("^\\$(.+)$", v)[0][0], v) # Extract key and lookup
      : v                                                              # Otherwise, keep the original value
    )
  }
  secret_environment_variables = lookup(each.value.cloud-function-gen2, "secrets", [])
  ingress_settings             = lookup(each.value.cloud-function-gen2, "ingress_settings", null)
  # passing the static values
  project         = var.project
  secret_ids      = var.secret_ids
  deploy_sa_email = var.deploy_sa_email
  owner           = var.owner
}

module "cronjob-gen2" {
  source   = "../modules/cronjob-gen2"
  for_each = { for config in local.terraform_configs : config.name => config if contains(keys(config), "cron") && contains(keys(config), "cloud-function-gen2") }

  name                 = each.value.name
  description          = lookup(each.value.cron, "description", each.value.description)
  schedule             = lookup(each.value.cron, "schedule", null)
  time_zone            = lookup(each.value.cron, "time_zone", null)
  attempt_deadline     = lookup(each.value.cron, "attempt_deadline", null)
  http_method          = lookup(each.value.cron, "http_method", null)
  target_function_name = module.cloud_function_gen2[each.value.name].function_name
  https_trigger_url    = module.cloud_function_gen2[each.value.name].function_trigger_url
  # passing the static values
  target_project  = var.project
  target_region   = var.region
  deploy_sa_email = var.deploy_sa_email
  owner           = var.owner

  depends_on = [
    module.cloud_function_gen2
  ]
}