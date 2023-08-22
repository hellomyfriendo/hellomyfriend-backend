data "google_storage_project_service_account" "gcs_sa" {
}

resource "google_kms_crypto_key_iam_member" "gcs_sa_confidential" {
  crypto_key_id = module.kms.confidential_kms_crypto_key
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_sa.email_address}"
}

resource "random_pet" "tfstate_bucket" {
  length = 4
}

resource "google_storage_bucket" "tfstate" {
  name     = random_pet.tfstate_bucket.id
  location = var.region

  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = module.kms.confidential_kms_crypto_key
  }

  versioning {
    enabled = true
  }

  depends_on = [
    google_kms_crypto_key_iam_member.gcs_sa_confidential
  ]
}
