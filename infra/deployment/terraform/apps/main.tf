locals {
  monitoring_alerts_emails_list = split(",", var.monitoring_alerts_emails)

  external_https_load_balancer_name = "hellomyfriendo-lb"
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

  monitoring_alerts_emails = local.monitoring_alerts_emails_list
}

module "api" {
  source = "./modules/api"

  org_id                                            = var.org_id
  all_users_ingress_tag_value_id                    = var.all_users_ingress_tag_value_id
  region                                            = var.region
  confidential_kms_crypto_key                       = var.confidential_kms_crypto_key
  api_image                                         = var.api_image
  api_sa_email                                      = var.api_sa_email
  external_https_load_balancer_backend_service_name = "${local.external_https_load_balancer_name}-default"
}

resource "google_compute_global_address" "external_https_load_balancer" {
  name = "external-https-lb"
}

module "external_https_load_balancer" {
  source = "./modules/external_https_load_balancer"

  region                         = var.region
  name                           = local.external_https_load_balancer_name
  ip_address                     = google_compute_global_address.external_https_load_balancer.address
  api_domain_name                = var.api_domain_name
  api_service_name               = module.api.service_name
  oauth2_client_id               = var.oauth2_client_id
  oauth2_client_secret_secret_id = var.oauth2_client_secret_secret_id
}
