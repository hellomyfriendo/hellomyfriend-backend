output "tfstate_bucket" {
  value = module.project.tfstate_bucket
}

output "tfvars_secret" {
  value = google_secret_manager_secret.tfvars.secret_id
}
