locals {
  friends_follows_collection         = "follows"
  friends_friend_requests_collection = "friend-requests"

  users_users_collection = "users"

  wants_wants_collection = "wants"
}

data "google_project" "project" {
  project_id = var.project_id
}

data "docker_registry_image" "backend" {
  name = var.backend_image
}

resource "random_string" "buckets_prefix" {
  length  = 4
  special = false
  upper   = false
}

resource "google_storage_bucket" "wants_images" {
  name          = "${random_string.buckets_prefix.result}-backend-wants-images"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true
}

# TODO(Marcus): Use Load Balancer + CDN to serve images
resource "google_storage_bucket_iam_member" "wants_images_all_users_reader" {
  bucket = google_storage_bucket.wants_images.name
  role   = "roles/storage.legacyObjectReader"
  member = "allUsers"
}

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
        value = var.project_id
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
        name  = "WANTS_STORAGE_WANTS_IMAGES_BUCKET"
        value = google_storage_bucket.wants_images.name
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
