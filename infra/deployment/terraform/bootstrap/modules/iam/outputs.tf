output "api_sa_email" {
  value = google_service_account.api.email
}

output "cloudbuild_apps_sa_email" {
  value = google_service_account.cloudbuild_apps.email
}
