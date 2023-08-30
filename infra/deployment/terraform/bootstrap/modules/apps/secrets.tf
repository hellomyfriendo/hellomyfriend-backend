resource "google_secret_manager_secret" "oauth2_client_secret" {
  secret_id = "oauth2-client-secret"

  replication {
    user_managed {
      replicas {
        location = var.region

        customer_managed_encryption {
          kms_key_name = var.confidential_kms_crypto_key
        }
      }
    }
  }
}

resource "google_secret_manager_secret_version" "oauth2_client_secret" {
  secret      = google_secret_manager_secret.oauth2_client_secret.id
  secret_data = var.oauth2_client_secret
}

resource "google_secret_manager_secret_iam_member" "oauth2_client_secret_cloudbuild_apps_sa" {
  secret_id = google_secret_manager_secret.oauth2_client_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.cloudbuild_apps_sa_email}"
}