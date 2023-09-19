data "google_project" "project" {
}

data "google_compute_network" "shared_vpc_network" {
  project = var.shared_vpc_network_host
  name    = var.shared_vpc_network_name
}
