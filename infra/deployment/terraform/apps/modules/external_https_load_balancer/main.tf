data "google_project" "project" {
}

data "google_secret_manager_secret_version" "oauth2_client_secret" {
  secret = var.oauth2_client_secret_secret_id
}

resource "google_compute_region_network_endpoint_group" "api" {
  name                  = "api"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = var.api_service_name
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
  managed_ssl_certificate_domains = [var.api_domain_name]
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
        enable               = true
        oauth2_client_id     = var.oauth2_client_id
        oauth2_client_secret = data.google_secret_manager_secret_version.oauth2_client_secret.secret_data
      }
    }
  }
}
