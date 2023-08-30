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
    "iap.googleapis.com",
    "language.googleapis.com",
    "maps-backend.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "serviceusage.googleapis.com",
    "sourcerepo.googleapis.com",
    "vision.googleapis.com"
  ]
}

resource "google_project_service" "enable_apis" {
  for_each                   = toset(local.enable_apis)
  service                    = each.value
  disable_dependent_services = false
  disable_on_destroy         = false
}
