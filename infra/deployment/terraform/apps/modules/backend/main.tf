locals {
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

resource "google_storage_bucket_iam_member" "wants_images_all_users_reader" {
  bucket = google_storage_bucket.wants_images.name
  role   = "roles/storage.legacyObjectReader"
  member = "user:allUsers"
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "${var.backend_image}@${data.docker_registry_image.backend.sha256_digest}"

      env {
        name  = "GOOGLE_CLOUD_PROJECT_ID"
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
}

resource "google_cloud_run_service_iam_member" "allow_unauthenticated" {
  location = google_cloud_run_v2_service.backend.location
  project  = google_cloud_run_v2_service.backend.project
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
