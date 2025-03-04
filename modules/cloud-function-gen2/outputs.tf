output "function_name" {
  value = google_cloudfunctions2_function.function.name
}

output "function_project" {
  value = google_cloudfunctions2_function.function.project
}

output "function_region" {
  value = google_cloudfunctions2_function.function.location
}

output "function_trigger_url" {
  value = google_cloudfunctions2_function.function.url
}