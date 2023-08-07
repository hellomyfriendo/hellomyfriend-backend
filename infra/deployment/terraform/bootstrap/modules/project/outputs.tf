output "bootstrap_kms_key_ring" {
  value = google_kms_key_ring.bootstrap.id
}

output "tfstate_bucket" {
  value = google_storage_bucket.tfstate.name
}
