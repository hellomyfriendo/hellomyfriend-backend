locals {
  backend_repository = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.backend.name}"
  backend_image      = "${local.backend_repository}/backend"

  cloudbuild_sa_email = "${data.google_project.project.number}@cloudbuild.gserviceaccount.com"

  cloudbuild_sa_secret_roles = [
    "roles/secretmanager.secretAccessor",
    "roles/secretmanager.viewer"
  ]

  compute_sa_email = "${data.google_project.project.number}-compute@developer.gserviceaccount.com"

  compute_sa_secret_roles = [
    "roles/secretmanager.secretAccessor",
  ]
}

data "google_project" "project" {
  project_id = var.project_id
}

# backend
resource "google_artifact_registry_repository" "backend" {
  location      = var.region
  repository_id = "backend"
  format        = "DOCKER"
}

resource "google_cloudbuild_trigger" "apps" {
  name = "apps"

  description = "Build and deploy the apps"

  trigger_template {
    repo_name   = var.sourcerepo_name
    branch_name = var.branch_name
  }

  filename = "infra/deployment/cloudbuild/apps/cloudbuild.yaml"

  substitutions = {
    _REGION                        = var.region
    _BACKEND_IMAGE                 = local.backend_image
    _BACKEND_SERVICE_ACCOUNT_EMAIL = var.backend_service_account_email
    _DOMAIN_NAME                   = var.domain_name
    _ALERTING_EMAILS               = join(",", var.alerting_emails)
    _TFSTATE_BUCKET                = var.tfstate_bucket
  }
}
