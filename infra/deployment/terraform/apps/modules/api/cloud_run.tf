data "docker_registry_image" "api" {
  name = var.api_image
}

resource "google_cloud_run_v2_service" "api" {
  name     = "api"
  location = var.region
  # TODO(Marcus): Uncomment when I figure where the Load Balancer will be
  # ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = var.api_sa_email
    encryption_key  = var.confidential_kms_crypto_key

    containers {
      image = "${var.api_image}@${data.docker_registry_image.api.sha256_digest}"

      # startup_probe {
      #   http_get {
      #     path = "/"
      #   }
      # }

      # liveness_probe {
      #   http_get {
      #     path = "/"
      #   }
      # }

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
        name  = "PGHOST"
        value = module.postgresql_database.private_ip_address
      }
      env {
        name  = "PGPORT"
        value = local.database_port
      }
      env {
        name  = "PGDATABASE"
        value = local.database_name
      }
      env {
        name  = "PGUSERNAME"
        value = local.database_username
      }
      env {
        name = "PGPASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_password.secret_id
            version = "latest"
          }
        }
      }
      env {
        name  = "WANTS_V1_STORAGE_WANTS_ASSETS_BUCKET"
        value = google_storage_bucket.wants_assets.name
      }
    }

    # TODO(Marcus): Raise this when I can pay for it
    scaling {
      max_instance_count = 1
    }

    vpc_access {
      # TODO(Marcus): Figure out if I can or should use direct VPC egress. See https://cloud.google.com/run/docs/configuring/shared-vpc-direct-vpc.
      connector = data.google_vpc_access_connector.api.id
      egress    = "ALL_TRAFFIC"
    }
  }

  depends_on = [
    google_secret_manager_secret_iam_member.api_sa_database_password,
    google_secret_manager_secret_iam_member.api_sa_api_key,
    google_storage_bucket_iam_member.api_sa_wants_assets
  ]
}

resource "google_tags_location_tag_binding" "all_users_ingress_api" {
  parent    = "//run.googleapis.com/projects/${data.google_project.project.number}/locations/${google_cloud_run_v2_service.api.location}/services/${google_cloud_run_v2_service.api.name}"
  tag_value = var.all_users_ingress_tag_value_id
  location  = google_cloud_run_v2_service.api.location

  depends_on = [
    google_cloud_run_v2_service.api
  ]
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
