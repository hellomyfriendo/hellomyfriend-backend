output "network_name" {
  value = module.vpc.network_name
}

output "private_service_access_google_compute_global_address_name" {
  value = google_compute_global_address.google_managed_services_range.name
}

output "private_service_access_peering_cmpleted" {
  value = null_resource.dependency_setter.id
}

output "vpc_access_connector_id" {
  value = google_vpc_access_connector.connector.id
}