data "google_project" "project" {
}

data "google_compute_network" "api" {
  name = var.api_network_name
}

data "google_vpc_access_connector" "api" {
  name = var.vpc_access_connector_name
}