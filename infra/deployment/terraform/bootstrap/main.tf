provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

module "enable_apis" {
  source = "./modules/enable_apis"
}

module "kms" {
  source = "./modules/kms"

  region = var.region

  depends_on = [
    module.enable_apis
  ]
}

module "iam" {
  source = "./modules/iam"

  org_id                      = var.org_id
  all_users_ingress_tag_key   = var.all_users_ingress_tag_key
  all_users_ingress_tag_value = var.all_users_ingress_tag_value
  public_kms_crypto_key       = module.kms.public_kms_crypto_key
  internal_kms_crypto_key     = module.kms.internal_kms_crypto_key
  confidential_kms_crypto_key = module.kms.confidential_kms_crypto_key
  restricted_kms_crypto_key   = module.kms.restricted_kms_crypto_key
  developers_group_email      = var.developers_group_email
  sourcerepo_name             = var.sourcerepo_name
}

module "apps" {
  source = "./modules/apps"

  org_id                      = var.org_id
  all_users_ingress_tag_key   = var.all_users_ingress_tag_key
  all_users_ingress_tag_value = var.all_users_ingress_tag_value
  region                      = var.region
  cloudbuild_apps_sa_email    = module.iam.cloudbuild_apps_sa_email
  api_sa_email                = module.iam.api_sa_email
  public_kms_crypto_key       = module.kms.public_kms_crypto_key
  internal_kms_crypto_key     = module.kms.internal_kms_crypto_key
  confidential_kms_crypto_key = module.kms.confidential_kms_crypto_key
  restricted_kms_crypto_key   = module.kms.restricted_kms_crypto_key
  monitoring_alerts_emails    = var.monitoring_alerts_emails
  sourcerepo_name             = var.sourcerepo_name
  sourcerepo_branch_name      = var.sourcerepo_branch_name
  tfstate_bucket              = google_storage_bucket.tfstate.name
}
