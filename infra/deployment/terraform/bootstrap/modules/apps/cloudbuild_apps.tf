data "google_tags_tag_key" "all_users_ingress" {
  parent     = "organizations/${var.org_id}"
  short_name = var.all_users_ingress_tag_key
}

data "google_tags_tag_value" "all_users_ingress" {
  parent     = data.google_tags_tag_key.all_users_ingress.id
  short_name = var.all_users_ingress_tag_value
}

data "google_service_account" "cloudbuild_apps" {
  account_id = var.cloudbuild_apps_sa_email
}

resource "google_cloudbuild_trigger" "apps" {
  name            = "apps"
  description     = "Build and deploy the apps"
  service_account = data.google_service_account.cloudbuild_apps.id

  trigger_template {
    repo_name   = var.sourcerepo_name
    branch_name = var.sourcerepo_branch_name
  }

  filename = "infra/deployment/cloudbuild/apps/cloudbuild.yaml"

  substitutions = {
    _ORG_ID                          = var.org_id
    _ALL_USERS_INGRESS_TAG_VALUE_ID  = data.google_tags_tag_value.all_users_ingress.id
    _SHARED_VPC_NETWORK_HOST         = var.shared_vpc_network_host
    _SHARED_VPC_NETWORK_NAME         = var.shared_vpc_network_name
    _VPC_ACCESS_CONNECTOR_NAME       = var.vpc_access_connector_name
    _REGION                          = var.region
    _PUBLIC_KMS_CRYPTO_KEY           = var.public_kms_crypto_key
    _INTERNAL_KMS_CRYPTO_KEY         = var.internal_kms_crypto_key
    _CONFIDENTIAL_KMS_CRYPTO_KEY     = var.confidential_kms_crypto_key
    _RESTRICTED_KMS_CRYPTO_KEY       = var.restricted_kms_crypto_key
    _API_IMAGE                       = local.api_image
    _API_SA_EMAIL                    = var.api_sa_email
    _API_SUBNETWORK_NAME             = var.api_subnetwork_name
    _API_DATABASE_ALLOCATED_IP_RANGE = var.api_database_allocated_ip_range
    _MONITORING_ALERTS_EMAILS        = join(",", var.monitoring_alerts_emails)
    _TFSTATE_BUCKET                  = var.tfstate_bucket
  }
}
