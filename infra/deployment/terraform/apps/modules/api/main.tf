locals {
  api_sa_bucket_roles = [
    "roles/storage.objectAdmin",
  ]

  friends_v1_friendships_collection     = "v1-friendships"
  friends_v1_friend_requests_collection = "v1-friend-requests"

  users_v1_users_collection = "v1-users"

  wants_v1_wants_collection = "v1-wants"
}

data "google_project" "project" {
}

data "google_storage_project_service_account" "gcs_sa" {
}

data "docker_registry_image" "api" {
  name = var.api_image
}

# KMS
resource "google_kms_key_ring" "keyring" {
  name     = "api-${var.region}-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "api" {
  name            = "api-key"
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key_iam_member" "gcs_sa_api" {
  crypto_key_id = google_kms_crypto_key.api.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_sa.email_address}"
}

# GCS
resource "google_storage_bucket" "wants_assets" {
  name     = "${data.google_project.project.project_id}-api-wants-assets"
  location = var.region

  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = google_kms_crypto_key.api.id
  }

  depends_on = [
    google_kms_crypto_key_iam_member.gcs_sa_api
  ]
}

resource "google_storage_bucket_iam_member" "wants_assets_api_sa" {
  for_each = toset(local.api_sa_bucket_roles)
  bucket   = google_storage_bucket.wants_assets.name
  role     = each.value
  member   = "serviceAccount:${var.api_sa_email}"
}

# API Keys
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
      }
    }
  }
}

resource "google_secret_manager_secret_version" "api_key" {
  secret      = google_secret_manager_secret.api_key.id
  secret_data = google_apikeys_key.api.key_string
}

resource "google_secret_manager_secret_iam_member" "api_key_api_sa" {
  secret_id = google_secret_manager_secret.api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.api_sa_email}"
}

# Cloud Run

resource "google_cloud_run_v2_service" "api" {
  name     = "api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = var.api_sa_email

    containers {
      image = "${var.api_image}@${data.docker_registry_image.api.sha256_digest}"

      env {
        name = "GOOGLE_API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_key.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "GOOGLE_PROJECT_ID"
        value = data.google_project.project.project_id
      }
      env {
        name  = "LOG_LEVEL"
        value = "info"
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "FRIENDS_V1_FIRESTORE_FRIENDSHIPS_COLLECTION"
        value = local.friends_v1_friendships_collection
      }
      env {
        name  = "FRIENDS_V1_FIRESTORE_FRIEND_REQUESTS_COLLECTION"
        value = local.friends_v1_friend_requests_collection
      }
      env {
        name  = "USERS_V1_FIRESTORE_USERS_COLLECTION"
        value = local.users_v1_users_collection
      }
      env {
        name  = "WANTS_V1_FIRESTORE_WANTS_COLLECTION"
        value = local.wants_v1_wants_collection
      }
      env {
        name  = "WANTS_V1_STORAGE_WANTS_ASSETS_BUCKET"
        value = google_storage_bucket.wants_assets.name
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.api_key_api_sa
  ]
}

resource "google_cloud_run_service_iam_member" "allow_unauthenticated" {
  location = google_cloud_run_v2_service.api.location
  project  = google_cloud_run_v2_service.api.project
  service  = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Load Balancer
resource "google_compute_region_network_endpoint_group" "api" {
  name                  = "api"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.api.name
  }
}

resource "google_compute_backend_service" "api" {
  name = "api"
  backend {
    group = google_compute_region_network_endpoint_group.api.id
  }
}

module "external_https_lb" {
  source  = "GoogleCloudPlatform/lb-http/google//modules/serverless_negs"
  version = "~> 9.0"

  project = data.google_project.project.project_id
  name    = "api"

  ssl                             = true
  managed_ssl_certificate_domains = [var.domain_name]
  https_redirect                  = true

  backends = {
    default = {
      description = null
      enable_cdn  = false

      groups = [
        {
          group = google_compute_region_network_endpoint_group.api.id
        }
      ]

      log_config = {
        enable      = true
        sample_rate = 1.0
      }

      iap_config = {
        enable = false
      }
    }
  }
}
