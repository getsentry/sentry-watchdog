resource "google_service_account" "function_sa" {
  account_id   = "cf-${var.name}"
  display_name = "Cloud Function Service Account for ${var.name}"
  description = "Service account for ${var.name}, owned by ${var.owner}, managed by Terraform"
}


resource "google_cloudfunctions2_function_iam_member" "invoker_iam" {
  project        = google_cloudfunctions2_function.function.project
  location       = google_cloudfunctions2_function.function.location
  cloud_function = google_cloudfunctions2_function.function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "serviceAccount:${google_service_account.function_sa.email}"
}

resource "google_cloudfunctions2_function_iam_member" "invoker_allusers_iam" {
  count          = var.allow_unauthenticated ? 1 : 0
  project        = google_cloudfunctions2_function.function.project
  location       = google_cloudfunctions2_function.function.location
  cloud_function = google_cloudfunctions2_function.function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}

resource "google_cloud_run_service_iam_member" "invoker_allusers_iam" {
  count    = var.allow_unauthenticated ? 1 : 0
  project  = google_cloudfunctions2_function.function.project
  location = google_cloudfunctions2_function.function.location
  service  = google_cloudfunctions2_function.function.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

resource "google_secret_manager_secret_iam_member" "secret_iam" {
  for_each  = { for s in var.secret_environment_variables : s.key => s }
  secret_id = each.value.secret
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.function_sa.email}"
}

resource "google_service_account_iam_member" "function_sa_actas_iam" {
  service_account_id = google_service_account.function_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.function_sa.email}"
}

resource "google_service_account_iam_member" "deploy_sa_actas_iam" {
  service_account_id = google_service_account.function_sa.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.deploy_sa_email}" # Allow deploy service account to manage this SA
}

resource "google_project_iam_member" "function_sa_logwriter_iam" {
  project = var.project
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.function_sa.email}"
}

data "archive_file" "source" {
  type        = "zip"
  source_dir  = var.source_dir
  output_path = "${var.temp_zip_output_dir}/${var.name}.zip"
  excludes    = var.files_to_exclude
}

resource "google_storage_bucket_object" "zip" {
  source       = data.archive_file.source.output_path
  content_type = "application/zip"
  metadata = {
    owner = var.owner
    terraformed = "true"
  }

  # Append to the MD5 checksum of the files's content
  # to force the zip to be updated as soon as a change occurs
  name   = "${var.source_object_prefix}${data.archive_file.source.output_md5}.zip"
  bucket = "${var.project}-cloud-function-staging"
}

resource "google_cloudfunctions2_function" "function" {
  name        = var.name
  location    = var.location
  description = var.description
  labels      = {
    owner = var.owner
    terraformed = "true"
  }

  build_config {
    runtime           = var.runtime
    entry_point       = var.function_entrypoint
    docker_repository = "projects/${var.project}/locations/${var.location}/repositories/gcf-artifacts"
    source {
      storage_source {
        # Get the source code of the cloud function as a Zip compression
        bucket = "${var.project}-cloud-function-staging"
        object = google_storage_bucket_object.zip.name
      }
    }
  }

  service_config {
    timeout_seconds       = var.execution_timeout
    available_memory      = var.available_memory
    service_account_email = google_service_account.function_sa.email
    ingress_settings      = var.ingress_settings
    environment_variables = var.environment_variables
    dynamic "secret_environment_variables" {
      for_each = var.secret_environment_variables
      iterator = item
      content {
        key        = item.value.key
        secret     = var.secret_ids[item.value.secret]
        version    = item.value.version
        project_id = var.project
      }
    }
  }


  depends_on = [
    google_secret_manager_secret_iam_member.secret_iam,
    google_service_account_iam_member.function_sa_actas_iam,
    google_service_account_iam_member.deploy_sa_actas_iam,
    data.archive_file.source
  ]
}
