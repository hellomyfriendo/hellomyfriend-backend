locals {
  backend_sa_bucket_roles = [
    "roles/storage.objectAdmin",
  ]

  friends_follows_collection         = "follows"
  friends_friend_requests_collection = "friend-requests"

  users_users_collection = "users"

  wants_wants_collection = "wants"
}

data "google_project" "project" {
}

data "google_storage_project_service_account" "gcs_sa" {
}

data "docker_registry_image" "backend" {
  name = var.backend_image
}

# KMS
resource "google_kms_key_ring" "keyring" {
  name     = "backend-${var.region}-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "backend" {
  name            = "backend-key"
  key_ring        = google_kms_key_ring.keyring.id
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key_iam_member" "gcs_sa_backend" {
  crypto_key_id = google_kms_crypto_key.backend.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_sa.email_address}"
}

# GCS
resource "random_string" "buckets_prefix" {
  length  = 4
  special = false
  upper   = false
}

resource "google_storage_bucket" "wants_assets" {
  name     = "${random_string.buckets_prefix.result}-backend-wants-assets"
  location = var.region

  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = google_kms_crypto_key.backend.id
  }

  depends_on = [
    google_kms_crypto_key_iam_member.gcs_sa_backend
  ]
}

resource "google_storage_bucket_iam_member" "wants_assets_backend_sa" {
  for_each = toset(local.backend_sa_bucket_roles)
  bucket   = google_storage_bucket.wants_assets.name
  role     = each.value
  member   = "serviceAccount:${var.backend_service_account_email}"
}

# API Keys

resource "google_apikeys_key" "backend" {
  name         = "backend-api-key"
  display_name = "Backend API Key"

  restrictions {
    api_targets {
      service = "geocoding-backend.googleapis.com"
    }
  }
}

resource "google_secret_manager_secret" "api_key" {
  secret_id = "backend-api-key"

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
  secret_data = google_apikeys_key.backend.key_string
}

resource "google_secret_manager_secret_iam_member" "api_key_backend_sa" {
  secret_id = google_secret_manager_secret.api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.backend_service_account_email}"
}

# Cloud Run

resource "google_cloud_run_v2_service" "backend" {
  name     = "backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = var.backend_service_account_email

    containers {
      image = "${var.backend_image}@${data.docker_registry_image.backend.sha256_digest}"

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
        name  = "FRIENDS_FIRESTORE_FOLLOWS_COLLECTION"
        value = local.friends_follows_collection
      }
      env {
        name  = "FRIENDS_FIRESTORE_FRIEND_REQUESTS_COLLECTION"
        value = local.friends_friend_requests_collection
      }
      env {
        name  = "USERS_FIRESTORE_USERS_COLLECTION"
        value = local.users_users_collection
      }
      env {
        name  = "WANTS_FIRESTORE_WANTS_COLLECTION"
        value = local.wants_wants_collection
      }
      env {
        name  = "WANTS_STORAGE_WANTS_ASSETS_BUCKET"
        value = google_storage_bucket.wants_assets.name
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.api_key_backend_sa
  ]
}

resource "google_cloud_run_service_iam_member" "allow_unauthenticated" {
  location = google_cloud_run_v2_service.backend.location
  project  = google_cloud_run_v2_service.backend.project
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Load Balancer
resource "google_compute_region_network_endpoint_group" "backend" {
  name                  = "backend"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }
}

resource "google_compute_backend_service" "backend" {
  name = "backend"
  backend {
    group = google_compute_region_network_endpoint_group.backend.id
  }
}

module "external_https_lb" {
  source  = "GoogleCloudPlatform/lb-http/google//modules/serverless_negs"
  version = "~> 9.0"

  project = data.google_project.project.project_id
  name    = "backend"

  ssl                             = true
  managed_ssl_certificate_domains = [var.domain_name]
  https_redirect                  = true

  backends = {
    default = {
      description = null
      enable_cdn  = false

      groups = [
        {
          group = google_compute_region_network_endpoint_group.backend.id
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
