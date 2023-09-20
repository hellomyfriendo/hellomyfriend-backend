output "network_name" {
  value = module.vpc.network_name
}

output "private_service_access_google_compute_global_address_name" {
  value = module.private_service_access.google_compute_global_address_name

  depends_on = [
    module.private_service_access.peering_completed
  ]
}

output "vpc_access_connector_name" {
  value = google_vpc_access_connector.connector.name

  depends_on = [
    google_vpc_access_connector.connector
  ]
}