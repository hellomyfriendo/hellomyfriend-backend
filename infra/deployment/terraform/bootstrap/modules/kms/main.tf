locals {
  kms_crypto_key_rotation_period = "7776000s" # 90 days
}

resource "google_kms_key_ring" "bootstrap" {
  name     = "bootstrap-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "artifact_registry" {
  name            = "artifactregistry-key"
  key_ring        = google_kms_key_ring.bootstrap.id
  rotation_period = local.kms_crypto_key_rotation_period

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key" "terraform_tfvars_secret" {
  name            = "terraform-tfvars-secret-key"
  key_ring        = google_kms_key_ring.bootstrap.id
  rotation_period = local.kms_crypto_key_rotation_period

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key" "tfstate_bucket" {
  name            = "tfstate-bucket-key"
  key_ring        = google_kms_key_ring.bootstrap.id
  rotation_period = local.kms_crypto_key_rotation_period

  lifecycle {
    prevent_destroy = true
  }
}
