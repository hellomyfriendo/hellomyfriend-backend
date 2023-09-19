resource "random_uuid" "wants_assets_bucket" {
}

resource "google_storage_bucket" "wants_assets" {
  name     = random_uuid.wants_assets_bucket.result
  location = var.region

  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = var.confidential_kms_crypto_key
  }
}

resource "google_storage_bucket_iam_member" "api_sa_wants_assets" {
  bucket = google_storage_bucket.wants_assets.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.api_sa_email}"
}
