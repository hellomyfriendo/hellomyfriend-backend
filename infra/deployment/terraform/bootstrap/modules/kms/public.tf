resource "google_kms_key_ring" "public" {
  name     = "public-${var.region}-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "public" {
  name            = "public-key"
  key_ring        = google_kms_key_ring.public.id
  rotation_period = local.kms_crypto_key_rotation_period

  lifecycle {
    prevent_destroy = true
  }
}