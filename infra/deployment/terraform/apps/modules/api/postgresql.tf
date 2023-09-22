locals {
  database_name = "hellomyfriendo"
  database_port = 5432
}

data "google_compute_zones" "available" {
  status = "UP"
}

# Database username
resource "random_password" "database_username" {
  length  = 14
  numeric = false
  special = false
  upper   = false
}

resource "google_secret_manager_secret" "database_username" {
  secret_id = "api-database-username"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "database_username" {
  secret = google_secret_manager_secret.database_username.id

  secret_data = random_password.database_username.result
}

resource "google_secret_manager_secret_iam_member" "api_sa_database_username" {
  secret_id = google_secret_manager_secret.database_username.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.api_sa_email}"
}

# Database password
resource "google_secret_manager_secret" "database_password" {
  secret_id = "api-database-password"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }
}

resource "google_secret_manager_secret_version" "database_password" {
  secret = google_secret_manager_secret.database_password.id

  secret_data = module.postgresql_database.generated_user_password
}

resource "google_secret_manager_secret_iam_member" "api_sa_database_password" {
  secret_id = google_secret_manager_secret.database_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.api_sa_email}"
}

# Database
module "postgresql_database" {
  source               = "GoogleCloudPlatform/sql-db/google//modules/postgresql"
  version              = "~> 13.0"
  availability_type    = "REGIONAL"
  database_version     = "POSTGRES_15"
  db_name              = local.database_name
  enable_default_db    = true
  enable_default_user  = true
  name                 = local.database_name
  project_id           = data.google_project.project.project_id
  random_instance_name = true
  region               = var.region
  tier                 = "db-f1-micro"
  user_name            = random_password.database_username.result
  zone                 = data.google_compute_zones.available.names[0]

  ip_configuration = {
    authorized_networks = []
    ipv4_enabled        = false
    private_network     = data.google_compute_network.api.id
    # TODO(Marcus): should I require SSL here, even in a private network?
    require_ssl                                   = false
    allocated_ip_range                            = var.api_database_allocated_ip_range
    enable_private_path_for_google_cloud_services = true
  }

  create_timeout = "60m"
  delete_timeout = "60m"
  update_timeout = "60m"

  deletion_protection = true
}