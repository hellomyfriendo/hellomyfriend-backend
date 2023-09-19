resource "random_uuid" "tfstate_bucket" {
}

resource "google_storage_bucket" "tfstate" {
  name     = random_uuid.tfstate_bucket.result
  location = var.region

  uniform_bucket_level_access = true

  encryption {
    default_kms_key_name = module.kms.confidential_kms_crypto_key
  }

  versioning {
    enabled = true
  }

  depends_on = [
    module.iam
  ]
}
