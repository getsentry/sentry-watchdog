resource "google_service_account" "gha_cloud_functions_deployment" {
  count = var.deploy_sa_email != null ? 0 : 1

  account_id   = "gha-cloud-functions-deployment"
  description  = "For use by Terraform and GitHub Actions to deploy cloud-functions, owned by ${var.owner}, managed by Terraform"
  display_name = "gha-cloud-functions-deployment"
  project      = var.project
}