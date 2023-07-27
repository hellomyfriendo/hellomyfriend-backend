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

resource "google_storage_bucket" "wants_assets" {
  name          = "${random_string.buckets_prefix.result}-backend-wants-assets"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true
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

# Load Balancer
resource "google_compute_region_network_endpoint_group" "backend" {
  name                  = "backend"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_v2_service.backend.name
  }
}

resource "google_compute_region_backend_service" "backend" {
  name                  = "backend"
  load_balancing_scheme = "EXTERNAL"
  backend {
    group = google_compute_region_network_endpoint_group.backend.id
  }
}

resource "google_compute_backend_bucket" "wants_assets_cdn" {
  name        = "wants-assets-cdn"
  description = "Contains Wants-related static resources"
  bucket_name = google_storage_bucket.wants_assets.name
  enable_cdn  = true
  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 3600
    default_ttl       = 3600
    max_ttl           = 86400
    negative_caching  = true
    serve_while_stale = 86400
  }
  custom_response_headers = [
    "X-Cache-ID: {cdn_cache_id}",
    "X-Cache-Hit: {cdn_cache_status}",
    "X-Client-Location: {client_region_subdivision}, {client_city}",
    "X-Client-IP-Address: {client_ip_address}"
  ]
}

resource "google_compute_url_map" "backend" {
  name = "backend"
  # TODO(Marcus): Create not found pages 
  default_service = google_compute_region_backend_service.backend.id
  host_rule {
    path_matcher = "backend"
    hosts = [
      "*",
    ]
  }
  path_matcher {
    name            = "backend"
    default_service = google_compute_region_backend_service.backend.id
    path_rule {
      paths = [
        "/assets/wants",
        "/assets/wants/*",
      ]
      service = google_compute_backend_bucket.wants_assets_cdn.id
    }
  }
}

module "external_https_lb" {
  source  = "GoogleCloudPlatform/lb-http/google//modules/serverless_negs"
  version = "~> 9.0"

  project = var.project_id
  name    = "external-https-lb"

  ssl                             = true
  managed_ssl_certificate_domains = [var.domain_name]
  https_redirect                  = true

  url_map        = google_compute_url_map.backend.id
  create_url_map = false

  backends = {
    default = {
      description = null
      enable_cdn  = false

      groups = [
        {
          # Your serverless service should have a NEG created that's referenced here.
          group = google_compute_region_network_endpoint_group.backend.id
        }
      ]

      log_config = {
        enable      = true
        sample_rate = 1.0
      }
    }
  }
}
