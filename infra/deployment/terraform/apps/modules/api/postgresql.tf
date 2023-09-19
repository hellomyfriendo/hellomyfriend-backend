# locals {
#   database_name = "hellomyfriendo"
# }

# module "postgresql" {
#   source               = "GoogleCloudPlatform/sql-db/google//modules/postgresql"
#   version = "~> 13.0"
#   availability_type = "REGIONAL"
#   database_version = "POSTGRES_15"
#   db_name = local.database_name
#   deletion_protection_enabled = true
#   enable_default_user = true
#   enable_random_password_special = true
#   encryption_key_name = var.confidential_kms_crypto_key

#   ip_configuration = {
#     ipv4_enabled        = false
#     require_ssl         = false
#     private_network     = data.google_compute_network.private_network.id
#     allocated_ip_range  = var.private_service_access_allocated_ip_range_name
#     authorized_networks = []
#   }

#   name                 = var.pg_ha_name
#   random_instance_name = true
#   project_id           = var.project_id
#   region               = "us-central1"

#   // Master configurations
#   tier                            = "db-custom-1-3840"
#   zone                            = "us-central1-c"
#   availability_type               = "REGIONAL"
#   maintenance_window_day          = 7
#   maintenance_window_hour         = 12
#   maintenance_window_update_track = "stable"

#   deletion_protection = false

#   database_flags = [{ name = "autovacuum", value = "off" }]

#   user_labels = {
#     foo = "bar"
#   }

#   ip_configuration = {
#     ipv4_enabled       = true
#     require_ssl        = true
#     private_network    = null
#     allocated_ip_range = null
#     authorized_networks = [
#       {
#         name  = "${var.project_id}-cidr"
#         value = var.pg_ha_external_ip_range
#       },
#     ]
#   }

#   backup_configuration = {
#     enabled                        = true
#     start_time                     = "20:55"
#     location                       = null
#     point_in_time_recovery_enabled = false
#     transaction_log_retention_days = null
#     retained_backups               = 365
#     retention_unit                 = "COUNT"
#   }

#   // Read replica configurations
#   read_replica_name_suffix = "-test-ha"
#   read_replicas = [
#     {
#       name                  = "0"
#       zone                  = "us-central1-a"
#       availability_type     = "REGIONAL"
#       tier                  = "db-custom-1-3840"
#       ip_configuration      = local.read_replica_ip_configuration
#       database_flags        = [{ name = "autovacuum", value = "off" }]
#       disk_autoresize       = null
#       disk_autoresize_limit = null
#       disk_size             = null
#       disk_type             = "PD_HDD"
#       user_labels           = { bar = "baz" }
#       encryption_key_name   = null
#     },
#     {
#       name                  = "1"
#       zone                  = "us-central1-b"
#       availability_type     = "REGIONAL"
#       tier                  = "db-custom-1-3840"
#       ip_configuration      = local.read_replica_ip_configuration
#       database_flags        = [{ name = "autovacuum", value = "off" }]
#       disk_autoresize       = null
#       disk_autoresize_limit = null
#       disk_size             = null
#       disk_type             = "PD_HDD"
#       user_labels           = { bar = "baz" }
#       encryption_key_name   = null
#     },
#     {
#       name                  = "2"
#       zone                  = "us-central1-c"
#       availability_type     = "REGIONAL"
#       tier                  = "db-custom-1-3840"
#       ip_configuration      = local.read_replica_ip_configuration
#       database_flags        = [{ name = "autovacuum", value = "off" }]
#       disk_autoresize       = null
#       disk_autoresize_limit = null
#       disk_size             = null
#       disk_type             = "PD_HDD"
#       user_labels           = { bar = "baz" }
#       encryption_key_name   = null
#     },
#   ]

#   db_name      = var.pg_ha_name
#   db_charset   = "UTF8"
#   db_collation = "en_US.UTF8"

#   additional_databases = [
#     {
#       name      = "${var.pg_ha_name}-additional"
#       charset   = "UTF8"
#       collation = "en_US.UTF8"
#     },
#   ]

#   user_name     = "tftest"
#   user_password = "foobar"

#   additional_users = [
#     {
#       name            = "tftest2"
#       password        = "abcdefg"
#       host            = "localhost"
#       random_password = false
#     },
#     {
#       name            = "tftest3"
#       password        = "abcdefg"
#       host            = "localhost"
#       random_password = false
#     },
#   ]
# }