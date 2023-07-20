locals {
  enable_apis = [
    "apikeys.googleapis.com",
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
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
}

resource "google_project_service" "enable_apis" {
  for_each                   = toset(local.enable_apis)
  service                    = each.value
  disable_dependent_services = false
  disable_on_destroy         = false
}

# Terraform state bucket
resource "random_pet" "tfstate_bucket" {
  length = 4
}

resource "google_storage_bucket" "tfstate" {
  name          = random_pet.tfstate_bucket.id
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }
}
