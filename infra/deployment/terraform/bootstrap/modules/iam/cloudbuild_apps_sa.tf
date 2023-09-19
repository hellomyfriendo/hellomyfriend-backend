locals {
  cloudbuild_apps_sa_roles = [
    "roles/serviceusage.apiKeysAdmin",
    "roles/run.admin",
    "roles/cloudsql.admin",
    "roles/compute.networkAdmin",
    "roles/logging.admin",
    "roles/monitoring.admin",
    "roles/secretmanager.admin",
    "roles/storage.admin",
  ]
}

data "google_tags_tag_key" "all_users_ingress" {
  parent     = "organizations/${var.org_id}"
  short_name = var.all_users_ingress_tag_key
}

data "google_tags_tag_value" "all_users_ingress" {
  parent     = data.google_tags_tag_key.all_users_ingress.id
  short_name = var.all_users_ingress_tag_value
}

resource "google_service_account" "cloudbuild_apps" {
  account_id   = "cloudbuild-apps"
  display_name = "CloudBuild Apps Service Account"
}

resource "google_tags_tag_value_iam_member" "all_users_ingress_cloudbuild_apps_sa" {
  tag_value = data.google_tags_tag_value.all_users_ingress.name
  role      = "roles/resourcemanager.tagUser"
  member    = "serviceAccount:${google_service_account.cloudbuild_apps.email}"
}

resource "google_project_iam_member" "cloudbuild_apps_sa" {
  for_each = toset(local.cloudbuild_apps_sa_roles)
  project  = data.google_project.project.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.cloudbuild_apps.email}"
}

resource "google_sourcerepo_repository_iam_member" "cloudbuild_apps_sa" {
  project    = data.google_project.project.project_id
  repository = var.sourcerepo_name
  role       = "roles/viewer"
  member     = "serviceAccount:${google_service_account.cloudbuild_apps.email}"
}
