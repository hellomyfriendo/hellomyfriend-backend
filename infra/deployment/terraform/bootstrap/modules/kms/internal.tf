resource "google_kms_key_ring" "internal" {
  name     = "internal-${var.region}-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "internal" {
  name            = "internal-key"
  key_ring        = google_kms_key_ring.internal.id
  rotation_period = local.kms_crypto_key_rotation_period

  lifecycle {
    prevent_destroy = true
  }
}