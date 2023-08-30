locals {
  friends_v1_friendships_collection     = "v1-friendships"
  friends_v1_friend_requests_collection = "v1-friend-requests"

  users_v1_users_collection = "v1-users"

  wants_v1_wants_collection = "v1-wants"
}

data "docker_registry_image" "api" {
  name = var.api_image
}

resource "google_cloud_run_v2_service" "api" {
  name     = "api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = var.api_sa_email
    encryption_key  = var.confidential_kms_crypto_key

    containers {
      image = "${var.api_image}@${data.docker_registry_image.api.sha256_digest}"

      startup_probe {
        http_get {
          path = "/"
        }
      }

      liveness_probe {
        http_get {
          path = "/"
        }
      }

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
    google_secret_manager_secret_iam_member.api_key_api_sa,
    google_storage_bucket_iam_member.wants_assets_api_sa
  ]
}

resource "google_tags_location_tag_binding" "all_users_ingress_api" {
  parent    = "//run.googleapis.com/projects/${data.google_project.project.number}/locations/${google_cloud_run_v2_service.api.location}/services/${google_cloud_run_v2_service.api.name}"
  tag_value = var.all_users_ingress_tag_value_id
  location  = google_cloud_run_v2_service.api.location
}

resource "google_cloud_run_service_iam_member" "allow_unauthenticated" {
  location = google_cloud_run_v2_service.api.location
  project  = google_cloud_run_v2_service.api.project
  service  = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"

  depends_on = [
    google_tags_location_tag_binding.all_users_ingress_api
  ]
}
