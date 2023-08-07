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
    "cloudbuild.builds.create",
    "compute.backendServices.create",
    "compute.backendServices.delete",
    "compute.backendServices.get",
    "compute.backendServices.update",
    "compute.globalAddresses.create",
    "compute.globalAddresses.delete",
    "compute.globalAddresses.get",
    "compute.globalForwardingRules.create",
    "compute.globalForwardingRules.delete",
    "compute.globalForwardingRules.get",
    "compute.globalForwardingRules.update",
    "compute.globalOperations.get",
    "logging.logEntries.create",
    "monitoring.alertPolicies.create",
    "monitoring.alertPolicies.delete",
    "monitoring.alertPolicies.get",
    "monitoring.alertPolicies.update",
    "monitoring.notificationChannels.create",
    "monitoring.notificationChannels.delete",
    "monitoring.notificationChannels.get",
    "monitoring.notificationChannels.update",
    "resourcemanager.projects.get",
    "secretmanager.secrets.create",
    "secretmanager.secrets.delete",
    "secretmanager.secrets.get",
    "secretmanager.secrets.update",
    "secretmanager.versions.add",
    "secretmanager.versions.destroy",
    "secretmanager.versions.disable",
    "secretmanager.versions.enable",
    "secretmanager.versions.get",
    "storage.buckets.create",
    "storage.buckets.delete",
    "storage.buckets.get",
    "storage.buckets.update",
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

# cloudnotifications.activities.list
# monitoring.dashboards.create
# monitoring.dashboards.delete
# monitoring.dashboards.get
# monitoring.dashboards.list
# monitoring.dashboards.update
# monitoring.groups.create
# monitoring.groups.delete
# monitoring.groups.get
# monitoring.groups.list
# monitoring.groups.update
# monitoring.metricDescriptors.create
# monitoring.metricDescriptors.delete
# monitoring.metricDescriptors.get
# monitoring.metricDescriptors.list
# monitoring.metricsScopes.link
# monitoring.monitoredResourceDescriptors.get
# monitoring.monitoredResourceDescriptors.list
# monitoring.notificationChannels.getVerificationCode
# monitoring.notificationChannels.sendVerificationCode
# monitoring.publicWidgets.create
# monitoring.publicWidgets.delete
# monitoring.publicWidgets.get
# monitoring.publicWidgets.list
# monitoring.publicWidgets.update
# monitoring.services.create
# monitoring.services.delete
# monitoring.services.get
# monitoring.services.list
# monitoring.services.update
# monitoring.slos.create
# monitoring.slos.delete
# monitoring.slos.get
# monitoring.slos.list
# monitoring.slos.update
# monitoring.snoozes.create
# monitoring.snoozes.get
# monitoring.snoozes.list
# monitoring.snoozes.update
# monitoring.timeSeries.create
# monitoring.timeSeries.list
# monitoring.uptimeCheckConfigs.create
# monitoring.uptimeCheckConfigs.delete
# monitoring.uptimeCheckConfigs.get
# monitoring.uptimeCheckConfigs.list
# monitoring.uptimeCheckConfigs.update
# opsconfigmonitoring.resourceMetadata.list
# opsconfigmonitoring.resourceMetadata.write
# resourcemanager.projects.get
# resourcemanager.projects.list
# serviceusage.services.enable
# stackdriver.projects.edit
# stackdriver.projects.get
# stackdriver.resourceMetadata.list
# stackdriver.resourceMetadata.write

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
