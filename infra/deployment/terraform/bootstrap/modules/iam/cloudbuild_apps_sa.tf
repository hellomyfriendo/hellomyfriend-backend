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

resource "google_project_iam_custom_role" "cloudbuild_apps" {
  role_id     = "cloudbuildApps"
  title       = "CloudBuild apps Service Account custom role"
  description = "Contains the permissions necessary to run the apps Cloud Build pipeline"
  # TODO(Marcus): See what to do about the setIamPolicy permissions
  permissions = [
    "apikeys.keys.getKeyString",
    "cloudbuild.builds.create",
    "compute.backendServices.create",
    "compute.backendServices.delete",
    "compute.backendServices.get",
    "compute.backendServices.use",
    "compute.backendServices.update",
    "compute.globalAddresses.create",
    "compute.globalAddresses.delete",
    "compute.globalAddresses.get",
    "compute.globalAddresses.update",
    "compute.globalAddresses.use",
    "compute.globalForwardingRules.create",
    "compute.globalForwardingRules.delete",
    "compute.globalForwardingRules.get",
    "compute.globalForwardingRules.update",
    "compute.globalOperations.get",
    "compute.regionNetworkEndpointGroups.create",
    "compute.regionNetworkEndpointGroups.delete",
    "compute.regionNetworkEndpointGroups.get",
    "compute.regionNetworkEndpointGroups.use",
    "compute.regionOperations.get",
    "compute.sslCertificates.create",
    "compute.sslCertificates.delete",
    "compute.sslCertificates.get",
    "compute.targetHttpProxies.create",
    "compute.targetHttpProxies.delete",
    "compute.targetHttpProxies.get",
    "compute.targetHttpProxies.update",
    "compute.targetHttpProxies.use",
    "compute.targetHttpsProxies.create",
    "compute.targetHttpsProxies.delete",
    "compute.targetHttpsProxies.get",
    "compute.targetHttpsProxies.update",
    "compute.targetHttpsProxies.use",
    "compute.urlMaps.create",
    "compute.urlMaps.delete",
    "compute.urlMaps.get",
    "compute.urlMaps.update",
    "compute.urlMaps.use",
    "logging.logs.list",
    "logging.logEntries.create",
    "logging.logEntries.list",
    "logging.notificationRules.create",
    "logging.notificationRules.delete",
    "logging.notificationRules.update",
    "monitoring.alertPolicies.create",
    "monitoring.alertPolicies.delete",
    "monitoring.alertPolicies.get",
    "monitoring.alertPolicies.update",
    "monitoring.notificationChannels.create",
    "monitoring.notificationChannels.delete",
    "monitoring.notificationChannels.get",
    "monitoring.notificationChannels.update",
    "resourcemanager.projects.get",
    "run.operations.get",
    "run.services.create",
    "run.services.createTagBinding",
    "run.services.delete",
    "run.services.deleteTagBinding",
    "run.services.get",
    "run.services.listEffectiveTags",
    "run.services.listTagBindings",
    "run.services.getIamPolicy",
    "run.services.setIamPolicy",
    "run.services.update",
    "secretmanager.secrets.create",
    "secretmanager.secrets.delete",
    "secretmanager.secrets.get",
    "secretmanager.secrets.getIamPolicy",
    "secretmanager.secrets.setIamPolicy",
    "secretmanager.versions.access",
    "secretmanager.versions.add",
    "secretmanager.versions.destroy",
    "secretmanager.versions.disable",
    "secretmanager.versions.enable",
    "secretmanager.versions.get",
    "serviceusage.apiKeys.create",
    "serviceusage.apiKeys.delete",
    "serviceusage.apiKeys.get",
    "storage.buckets.create",
    "storage.buckets.delete",
    "storage.buckets.get",
    "storage.buckets.update",
    "storage.buckets.getIamPolicy",
    "storage.buckets.setIamPolicy"
  ]
}

resource "google_project_iam_member" "cloudbuild_apps_sa_custom_role" {
  project = data.google_project.project.project_id
  role    = google_project_iam_custom_role.cloudbuild_apps.name
  member  = "serviceAccount:${google_service_account.cloudbuild_apps.email}"
}

resource "google_storage_bucket_iam_member" "cloudbuild_apps_sa_tfstate_bucket" {
  bucket = var.tfstate_bucket
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloudbuild_apps.email}"
}

resource "google_sourcerepo_repository_iam_member" "cloudbuild_apps_sa" {
  project    = data.google_project.project.project_id
  repository = var.sourcerepo_name
  role       = "roles/viewer"
  member     = "serviceAccount:${google_service_account.cloudbuild_apps.email}"
}
