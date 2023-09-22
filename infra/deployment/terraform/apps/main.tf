locals {
  monitoring_alerts_emails_list = split(",", var.monitoring_alerts_emails)
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

module "network" {
  source = "./modules/network"
}

module "api" {
  source = "./modules/api"

  org_id                          = var.org_id
  all_users_ingress_tag_value_id  = var.all_users_ingress_tag_value_id
  region                          = var.region
  api_image                       = var.api_image
  api_sa_email                    = var.api_sa_email
  api_network_name                = module.network.network_name
  api_database_allocated_ip_range = module.network.private_service_access_google_compute_global_address_name
  vpc_access_connector_id         = module.network.vpc_access_connector_id

  depends_on = [
    module.network.private_service_access_peering_completed
  ]
}
