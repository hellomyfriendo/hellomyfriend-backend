locals {
  api_sa_roles = [
    "roles/cloudsql.client",
    "roles/iam.serviceAccountTokenCreator"
  ]
}

resource "google_service_account" "api" {
  account_id   = "api-sa"
  display_name = "API Service Account"
}

resource "google_project_iam_member" "api_sa" {
  for_each = toset(local.api_sa_roles)
  project  = data.google_project.project.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.api.email}"
}

resource "google_service_account_iam_member" "api_sa_cloudbuild_apps_sa" {
  service_account_id = google_service_account.api.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${local.cloudbuild_sa_email}"
}

resource "google_service_account_iam_member" "api_sa_developers_group" {
  service_account_id = google_service_account.api.name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "group:${var.developers_group_email}"
}