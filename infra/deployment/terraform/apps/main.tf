locals {
  alerting_emails_list = split(",", var.alerting_emails)
}

data "google_client_config" "default" {
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

provider "docker" {
  registry_auth {
    address  = "${var.region}-docker.pkg.dev"
    username = "oauth2accesstoken"
    password = data.google_client_config.default.access_token
  }
}

module "monitoring" {
  source = "./modules/monitoring"

  alerting_emails = local.alerting_emails_list
}

resource "google_compute_global_address" "api_external_https_lb" {
  name = "api-external-https-lb"
}

module "api" {
  source = "./modules/api"

  region                           = var.region
  api_image                        = var.api_image
  api_sa_email                     = var.api_sa_email
  api_domain_name                  = var.api_domain_name
  api_external_https_lb_ip_address = google_compute_global_address.api_external_https_lb.address
}
