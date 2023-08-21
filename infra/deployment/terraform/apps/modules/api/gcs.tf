locals {
  api_sa_bucket_roles = [
    "roles/storage.objectAdmin",
  ]
}

resource "google_storage_bucket" "wants_assets" {
  name     = "${data.google_project.project.project_id}-api-wants-assets"
  location = var.region

  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = var.confidential_kms_crypto_key
  }
}

resource "google_storage_bucket_iam_member" "wants_assets_api_sa" {
  for_each = toset(local.api_sa_bucket_roles)
  bucket   = google_storage_bucket.wants_assets.name
  role     = each.value
  member   = "serviceAccount:${var.api_sa_email}"
}
