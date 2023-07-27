locals {
  cloudbuild_sa_email = "${data.google_project.project.number}@cloudbuild.gserviceaccount.com"

  cloudbuild_sa_roles = [
    "roles/editor", # Only Editor allows the creation of monitoring alerts. See https://github.com/hashicorp/terraform-provider-google/issues/11603,
    "roles/secretmanager.admin"
  ]
}

data "google_project" "project" {
  project_id = var.project_id
}

resource "google_project_iam_member" "cloudbuild_sa" {
  for_each = toset(local.cloudbuild_sa_roles)
  project  = data.google_project.project.project_id
  role     = each.value
  member   = "serviceAccount:${local.cloudbuild_sa_email}"
}

# Backend service account

resource "google_service_account" "backend" {
  account_id   = "backend"
  display_name = "Backend Service Account"
}

resource "google_project_iam_custom_role" "backend" {
  role_id     = "backend"
  title       = "Backend Service Account custom role"
  description = "Contains the permissions necessary to run the backend Cloud Run service"
  permissions = [
    "appengine.applications.get",
    "compute.backendServices.get",
    "datastore.databases.get",
    "datastore.databases.getMetadata",
    "datastore.entities.allocateIds",
    "datastore.entities.create",
    "datastore.entities.delete",
    "datastore.entities.get",
    "datastore.entities.list",
    "datastore.entities.update",
    "datastore.indexes.list",
    "datastore.namespaces.get",
    "datastore.namespaces.list",
    "datastore.statistics.get",
    "datastore.statistics.list",
    "iam.serviceAccounts.signBlob",
    "resourcemanager.projects.get",
  ]
}

resource "google_project_iam_member" "backend_sa" {
  project = data.google_project.project.project_id
  role    = google_project_iam_custom_role.backend.name
  member  = "serviceAccount:${google_service_account.backend.email}"
}

# Enable audit logs

resource "google_project_iam_audit_config" "project" {
  project = data.google_project.project.project_id
  service = "allServices"
  audit_log_config {
    log_type = "ADMIN_READ"
  }
  audit_log_config {
    log_type = "DATA_READ"
  }
  audit_log_config {
    log_type = "DATA_WRITE"
  }
}
