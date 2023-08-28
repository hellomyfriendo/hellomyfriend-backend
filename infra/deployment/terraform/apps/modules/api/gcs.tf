resource "google_storage_bucket" "wants_assets" {
  name          = uuid()
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = var.confidential_kms_crypto_key
  }
}

resource "google_storage_bucket_iam_member" "wants_assets_api_sa" {
  bucket   = google_storage_bucket.wants_assets.name
  role     = "roles/storage.objectAdmin"
  member   = "serviceAccount:${var.api_sa_email}"
}
