resource "google_kms_key_ring" "restricted" {
  name     = "restricted-${var.region}-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "restricted" {
  name            = "restricted-key"
  key_ring        = google_kms_key_ring.restricted.id
  rotation_period = local.kms_crypto_key_rotation_period

  lifecycle {
    prevent_destroy = true
  }
}