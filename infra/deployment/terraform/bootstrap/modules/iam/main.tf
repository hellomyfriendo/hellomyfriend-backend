locals {
  artifact_registry_sa = "service-${data.google_project.project.number}@gcp-sa-artifactregistry.iam.gserviceaccount.com"

  ninety_days_in_seconds = "7776000s"
}

data "google_project" "project" {
}

# Cloud Build Apps service account
resource "google_service_account" "cloudbuild_apps" {
  account_id   = "cloudbuild-apps"
  display_name = "CloudBuild Apps Service Account"
}

resource "google_project_iam_custom_role" "cloudbuild_apps" {
  role_id     = "cloudbuildApps"
  title       = "CloudBuild apps Service Account custom role"
  description = "Contains the permissions necessary to run the apps Cloud Build pipeline"
  permissions = [
    "apikeys.keys.getKeyString",
    "cloudbuild.builds.create",
    "cloudkms.keyRings.create",
    "cloudkms.keyRings.get",
    "compute.backendServices.create",
    "compute.backendServices.delete",
    "compute.backendServices.get",
    "compute.globalAddresses.create",
    "compute.globalAddresses.delete",
    "compute.globalAddresses.get",
    "compute.globalForwardingRules.create",
    "compute.globalForwardingRules.delete",
    "compute.globalForwardingRules.get",
    "compute.globalOperations.get",
    "compute.sslCertificates.create",
    "compute.sslCertificates.delete",
    "compute.sslCertificates.get",
    "compute.urlMaps.create",
    "compute.urlMaps.delete",
    "compute.urlMaps.get",
    "logging.logs.list",
    "logging.logEntries.create",
    "logging.logEntries.list",
    "logging.notificationRules.create",
    "logging.notificationRules.delete",
    "logging.notificationRules.update",
    "monitoring.alertPolicies.create",
    "monitoring.alertPolicies.delete",
    "monitoring.alertPolicies.get",
    "monitoring.notificationChannels.create",
    "monitoring.notificationChannels.delete",
    "monitoring.notificationChannels.get",
    "resourcemanager.projects.get",
    "secretmanager.secrets.create",
    "serviceusage.apiKeys.create",
    "serviceusage.apiKeys.delete",
    "serviceusage.apiKeys.get",
    "storage.buckets.create",
  ]
}

resource "google_sourcerepo_repository_iam_member" "cloudbuild_apps_sa" {
  project    = data.google_project.project.project_id
  repository = var.sourcerepo_name
  role       = "roles/viewer"
  member     = "serviceAccount:${google_service_account.cloudbuild_apps.email}"
}

resource "google_storage_bucket_iam_member" "cloudbuild_apps_sa" {
  bucket = var.tfstate_bucket
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloudbuild_apps.email}"
}

resource "google_project_iam_member" "cloudbuild_apps_sa" {
  project = data.google_project.project.project_id
  role    = google_project_iam_custom_role.cloudbuild_apps.name
  member  = "serviceAccount:${google_service_account.cloudbuild_apps.email}"
}

# Artifact Registry service account
# Create this manually on the very first time. See https://cloud.google.com/artifact-registry/docs/ar-service-account
resource "google_kms_crypto_key" "artifact_registry" {
  name            = "artifactregistry-key"
  key_ring        = var.bootstrap_kms_key_ring
  rotation_period = local.ninety_days_in_seconds

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_kms_crypto_key_iam_member" "artifact_registry_sa" {
  crypto_key_id = google_kms_crypto_key.artifact_registry.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${local.artifact_registry_sa}"
}

# API service account
resource "google_service_account" "api" {
  account_id   = "api-sa"
  display_name = "API Service Account"
}

resource "google_project_iam_custom_role" "api" {
  role_id     = "api"
  title       = "API Service Account custom role"
  description = "Contains the permissions necessary to run the API Cloud Run service"
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

resource "google_project_iam_member" "api_sa" {
  project = data.google_project.project.project_id
  role    = google_project_iam_custom_role.api.name
  member  = "serviceAccount:${google_service_account.api.email}"
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
