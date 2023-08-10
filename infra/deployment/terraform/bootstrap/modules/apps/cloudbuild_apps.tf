data "google_tags_tag_key" "all_users_ingress" {
  parent     = "organizations/${var.org_id}"
  short_name = var.all_users_ingress_tag_key
}

data "google_tags_tag_value" "all_users_ingress" {
  parent     = data.google_tags_tag_key.all_users_ingress.id
  short_name = var.all_users_ingress_tag_value
}

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
    _ORG_ID                         = var.org_id
    _ALL_USERS_INGRESS_TAG_VALUE_ID = data.google_tags_tag_value.all_users_ingress.id
    _REGION                         = var.region
    _API_IMAGE                      = local.api_image
    _API_SA_EMAIL                   = var.api_sa_email
    _API_DOMAIN_NAME                = var.api_domain_name
    _MONITORING_ALERTS_EMAILS       = join(",", var.monitoring_alerts_emails)
    _TFSTATE_BUCKET                 = var.tfstate_bucket
  }
}
