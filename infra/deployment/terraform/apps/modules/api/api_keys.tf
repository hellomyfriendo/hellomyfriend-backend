resource "google_apikeys_key" "api" {
  name         = "api-api-key"
  display_name = "API API Key"

  restrictions {
    api_targets {
      service = "geocoding-backend.googleapis.com"
    }
  }
}

resource "google_secret_manager_secret" "api_key" {
  secret_id = "api-api-key"

  replication {
    user_managed {
      replicas {
        location = var.region
        customer_managed_encryption {
          kms_key_name = google_kms_crypto_key.api.id
        }
      }
    }
  }

  depends_on = [
    google_kms_crypto_key_iam_member.secret_manager_service_agent_identity_api
  ]
}

resource "google_secret_manager_secret_version" "api_key" {
  secret      = google_secret_manager_secret.api_key.id
  secret_data = google_apikeys_key.api.key_string
}

resource "google_secret_manager_secret_iam_member" "api_key_api_sa" {
  secret_id = google_secret_manager_secret.api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.api_sa_email}"

  depends_on = [
    google_secret_manager_secret_version.api_key
  ]
}
