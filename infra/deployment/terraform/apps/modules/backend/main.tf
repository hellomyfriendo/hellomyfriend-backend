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

resource "google_cloud_run_v2_service" "backend" {
  name     = "backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

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
    }
  }

  depends_on = [
    google_firestore_index.mandatory_medical_device_problem_reporting_form_for_industry_data_extractions_jobid_and_created_at
  ]
}

resource "google_cloud_run_service_iam_member" "allow_unauthenticated" {
  location = google_cloud_run_v2_service.backend.location
  project  = google_cloud_run_v2_service.backend.project
  service  = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
