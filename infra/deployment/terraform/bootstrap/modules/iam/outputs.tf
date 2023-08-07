output "cloudbuild_apps_sa_email" {
  value = google_service_account.cloudbuild_apps.email
}

output "api_sa_email" {
  value = google_service_account.api.email
}

output "artifact_registry_kms_crypto_key" {
  value = google_kms_crypto_key.artifact_registry.id
}
