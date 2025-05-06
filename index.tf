module "infrastructure" {
  source = "./infrastructure"

  project         = var.project
  region          = var.region
  project_id      = var.project_id
  deploy_sa_email = var.deploy_sa_email
  owner           = var.owner
  maintainers     = var.maintainers
}

module "functions" {
  source = "./functions"

  project         = var.project
  region          = var.region
  project_id      = var.project_id
  secret_ids      = module.infrastructure.secret_ids
  deploy_sa_email = var.deploy_sa_email != null ? var.deploy_sa_email : module.infrastructure.deploy_sa_email
  local_variables = local.local_variables # this passes the vars in terraform.tfvars to module as a map, this is a hack to make the vars available to the yamls
  owner           = var.owner

  depends_on = [
    module.infrastructure
  ]
}

module "pubsubs" {
  source = "./pubsubs"

  project                   = var.project
  region                    = var.region
  project_id                = var.project_id
  bucket_location           = var.bucket_location
  zone                      = var.zone
  deploy_sa_email           = var.deploy_sa_email != null ? var.deploy_sa_email : module.infrastructure.deploy_sa_email
  owner                     = var.owner
  function_service_accounts = module.functions.function_trigger_service_accounts

  depends_on = [
    module.infrastructure,
    module.functions

  ]
}

module "gcs" {
  source = "./gcs"

  project         = var.project
  region          = var.region
  project_id      = var.project_id
  bucket_location = var.bucket_location
  zone            = var.zone
  deploy_sa_email = var.deploy_sa_email != null ? var.deploy_sa_email : module.infrastructure.deploy_sa_email
  owner           = var.owner

  depends_on = [
    module.infrastructure,
    module.functions

  ]
}
