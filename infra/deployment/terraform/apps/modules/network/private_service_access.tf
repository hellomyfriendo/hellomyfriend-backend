resource "google_compute_global_address" "google_managed_services_range" {
  project       = data.google_project.project.project_id
  name          = "google-managed-services-${module.vpc.network_name}"
  purpose       = "VPC_PEERING"
  prefix_length = 16
  address_type  = "INTERNAL"
  network       = module.vpc.network_self_link
}

resource "google_service_networking_connection" "private_service_access" {
  network                 = module.vpc.network_self_link
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.google_managed_services_range.name]
}

resource "null_resource" "dependency_setter" {
  depends_on = [google_service_networking_connection.private_service_access]
}