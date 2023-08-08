output "artifact_registry_kms_crypto_key" {
  value = google_kms_crypto_key.artifact_registry.id
}

output "terraform_tfvars_secret_kms_crypto_key" {
  value = google_kms_crypto_key.terraform_tfvars_secret.id
}

output "tfstate_bucket_kms_crypto_key" {
  value = google_kms_crypto_key.tfstate_bucket.id
}
