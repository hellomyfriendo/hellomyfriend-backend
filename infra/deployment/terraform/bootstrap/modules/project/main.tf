locals {
  enable_apis = [
    "apikeys.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudasset.googleapis.com",
    "cloudbuild.googleapis.com",
    "cloudkms.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com",
    "firestore.googleapis.com",
    "geocoding-backend.googleapis.com",
    "iam.googleapis.com",
    "maps-backend.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "serviceusage.googleapis.com",
    "sourcerepo.googleapis.com"
  ]

  ninety_days_in_seconds = "7776000s"
}

data "google_storage_project_service_account" "gcs_sa" {
}

resource "google_project_service" "enable_apis" {
  for_each                   = toset(local.enable_apis)
  service                    = each.value
  disable_dependent_services = false
  disable_on_destroy         = false
}

# KMS
resource "google_kms_key_ring" "bootstrap" {
  name     = "bootstrap-keyring"
  location = var.region

  depends_on = [
    google_project_service.enable_apis
  ]
}

resource "google_kms_crypto_key" "tfstate_bucket" {
  name            = "tfstate-bucket-key"
  key_ring        = google_kms_key_ring.bootstrap.id
  rotation_period = local.ninety_days_in_seconds

  lifecycle {
    prevent_destroy = true
  }
}

# Terraform state bucket
resource "random_pet" "tfstate_bucket" {
  length = 4
}

resource "google_kms_crypto_key_iam_member" "gcs_sa_tfstate_bucket" {
  crypto_key_id = google_kms_crypto_key.tfstate_bucket.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_sa.email_address}"
}

resource "google_storage_bucket" "tfstate" {
  name     = random_pet.tfstate_bucket.id
  location = var.region

  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = google_kms_crypto_key.tfstate_bucket.id
  }

  versioning {
    enabled = true
  }

  depends_on = [
    google_kms_crypto_key_iam_member.gcs_sa_tfstate_bucket
  ]
}
