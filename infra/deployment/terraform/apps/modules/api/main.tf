data "google_project" "project" {
}

data "google_compute_network" "api" {
  name = var.api_network_name
}