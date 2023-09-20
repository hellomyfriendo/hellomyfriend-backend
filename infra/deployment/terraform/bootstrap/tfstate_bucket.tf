resource "random_uuid" "tfstate_bucket" {
}

resource "google_storage_bucket" "tfstate" {
  name     = random_uuid.tfstate_bucket.result
  location = var.region

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }
}
