locals {
  cloudbuild_sa_email = "${data.google_project.project.number}@cloudbuild.gserviceaccount.com"

  cloudbuild_sa_roles = [
    "roles/compute.admin",
    "roles/datastore.owner",
    "roles/pubsub.admin",
    "roles/iam.serviceAccountUser",
    "roles/iam.serviceAccountAdmin",
    "roles/serviceusage.apiKeysAdmin",
    "roles/run.admin",
    "roles/secretmanager.admin",
    "roles/storage.admin"
  ]

  compute_sa_email = "${data.google_project.project.number}-compute@developer.gserviceaccount.com"

  compute_sa_roles = [
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

resource "google_project_iam_member" "compute_sa" {
  for_each = toset(local.compute_sa_roles)
  project  = data.google_project.project.project_id
  role     = each.value
  member   = "serviceAccount:${local.compute_sa_email}"
}
