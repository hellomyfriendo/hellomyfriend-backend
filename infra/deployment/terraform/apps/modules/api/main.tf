data "google_project" "project" {
}

data "google_compute_network" "shared_vpc_network" {
  project = var.shared_vpc_network_host
  name    = var.shared_vpc_network_name
}

data "google_vpc_access_connector" "shared_vpc_network" {
  project = var.shared_vpc_network_host
  name    = var.vpc_access_connector_name
}
