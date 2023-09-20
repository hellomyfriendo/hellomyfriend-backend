locals {
  api_repository = "${var.region}-docker.pkg.dev/${data.google_project.project.project_id}/${google_artifact_registry_repository.api.name}"
  api_image      = "${local.api_repository}/api"
}

resource "google_artifact_registry_repository" "api" {
  location      = var.region
  repository_id = "api"
  format        = "DOCKER"
}
