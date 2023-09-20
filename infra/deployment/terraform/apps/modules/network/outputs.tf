output "network_name" {
  value = module.vpc.network_name
}

output "vpc_access_connector_name" {
  value = google_vpc_access_connector.connector.name
}