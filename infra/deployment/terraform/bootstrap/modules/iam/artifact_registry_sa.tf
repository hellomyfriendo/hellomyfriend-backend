resource "google_project_service_identity" "artifact_registry" {
  provider = google-beta
  project  = data.google_project.project.project_id
  service  = "artifactregistry.googleapis.com"
}

resource "google_kms_crypto_key_iam_member" "artifact_registry_sa_confidential" {
  crypto_key_id = var.confidential_kms_crypto_key
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_project_service_identity.artifact_registry.email}"
}
