locals {
  database_name     = "api"
  database_port     = 5432
  database_username = "default"
}

data "google_compute_zones" "available" {
  status = "UP"
}

module "postgresql_database" {
  source                         = "GoogleCloudPlatform/sql-db/google//modules/postgresql"
  version                        = "~> 13.0"
  availability_type              = "REGIONAL"
  database_version               = "POSTGRES_15"
  db_name                        = local.database_name
  enable_default_user            = true
  encryption_key_name            = var.confidential_kms_crypto_key
  name                           = local.database_name
  project_id                     = data.google_project.project.project_id
  random_instance_name           = true
  region                         = var.region
  tier                           = "db-f1-micro"
  user_name                      = local.database_username
  zone                           = data.google_compute_zones.available.names[0]

  ip_configuration = {
    authorized_networks                           = []
    ipv4_enabled                                  = false
    private_network                               = data.google_compute_network.shared_vpc_network.id
    require_ssl                                   = false
    allocated_ip_range                            = var.api_database_allocated_ip_range
    enable_private_path_for_google_cloud_services = true
  }

  create_timeout = "60m"
  delete_timeout = "60m"
  update_timeout = "60m"

  deletion_protection = true
}

# Database secrets
resource "google_secret_manager_secret" "database_password" {
  secret_id = "api-database-password"

  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "database_password" {
  secret = google_secret_manager_secret.database_password.id

  secret_data = module.postgresql_database.generated_user_password
}