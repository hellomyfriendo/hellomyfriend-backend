resource "google_kms_key_ring" "confidential" {
  name     = "confidential-${var.region}-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "confidential" {
  name            = "confidential-key"
  key_ring        = google_kms_key_ring.confidential.id
  rotation_period = local.kms_crypto_key_rotation_period

  lifecycle {
    prevent_destroy = true
  }
}