output "terraform_tfvars" {
  value = google_secret_manager_secret.terraform_tfvars.id
}

output "tfstate_bucket" {
  value = google_storage_bucket.tfstate.name
}
