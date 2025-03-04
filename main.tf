terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.20.0"
    }
  }
  # backend "gcs" {
  #   # Had to hardcode the bucket name here because it does not support variables
  #   bucket = "jeffreyhung-test-tfstate"
  #   prefix = "terraform/state"
  # }
}

provider "google" {
  project = var.project
  region  = var.region
  zone    = var.zone
}
