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

resource "google_compute_global_address" "backend_external_https_lb" {
  name = "backend-external-https-lb"
}

module "backend" {
  source = "./modules/backend"

  region                        = var.region
  backend_image                 = var.backend_image
  backend_service_account_email = var.backend_service_account_email
  domain_name                   = var.domain_name
  external_https_lb_ip_address  = google_compute_global_address.backend_external_https_lb.address
}
