resource "random_id" "api_key" {
  byte_length = 2
}

resource "google_apikeys_key" "api" {
  name         = "api-api-key-${random_id.api_key.hex}"
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
      }
    }
  }
}

resource "google_secret_manager_secret_version" "api_key" {
  secret      = google_secret_manager_secret.api_key.id
  secret_data = google_apikeys_key.api.key_string
}

resource "google_secret_manager_secret_iam_member" "api_sa_api_key" {
  secret_id = google_secret_manager_secret.api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.api_sa_email}"
}
