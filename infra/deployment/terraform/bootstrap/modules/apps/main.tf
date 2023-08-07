locals {
  api_repository = "${var.region}-docker.pkg.dev/${data.google_project.project.project_id}/${google_artifact_registry_repository.api.name}"
  api_image      = "${local.api_repository}/api"
}

data "google_project" "project" {
}

# API
resource "google_artifact_registry_repository" "api" {
  location      = var.region
  repository_id = "api"
  format        = "DOCKER"
  kms_key_name  = var.artifact_registry_kms_crypto_key
}

resource "google_artifact_registry_repository_iam_member" "api_cloudbuild_apps_sa" {
  project    = google_artifact_registry_repository.api.project
  location   = google_artifact_registry_repository.api.location
  repository = google_artifact_registry_repository.api.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${var.cloudbuild_apps_sa_email}"
}

# Cloud Build apps
resource "google_cloudbuild_trigger" "apps" {
  name            = "apps"
  description     = "Build and deploy the apps"
  service_account = "projects/${data.google_project.project.project_id}/serviceAccounts/${var.cloudbuild_apps_sa_email}"

  trigger_template {
    repo_name   = var.sourcerepo_name
    branch_name = var.sourcerepo_branch_name
  }

  filename = "infra/deployment/cloudbuild/apps/cloudbuild.yaml"

  substitutions = {
    _REGION                   = var.region
    _API_IMAGE                = local.api_image
    _API_SA_EMAIL             = var.api_sa_email
    _API_DOMAIN_NAME          = var.api_domain_name
    _MONITORING_ALERTS_EMAILS = join(",", var.monitoring_alerts_emails)
    _TFSTATE_BUCKET           = var.tfstate_bucket
  }
}
