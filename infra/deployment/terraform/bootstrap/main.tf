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

  org_id                                 = var.org_id
  all_users_ingress_tag_key              = var.all_users_ingress_tag_key
  all_users_ingress_tag_value            = var.all_users_ingress_tag_value
  artifact_registry_kms_crypto_key       = module.kms.artifact_registry_kms_crypto_key
  terraform_tfvars_secret_kms_crypto_key = module.kms.terraform_tfvars_secret_kms_crypto_key
  sourcerepo_name                        = var.sourcerepo_name
  tfstate_bucket                         = google_storage_bucket.tfstate.name
}

module "firestore" {
  source = "./modules/firestore"

  location_id = var.region

  depends_on = [module.enable_apis]
}

module "apps" {
  source = "./modules/apps"

  org_id                           = var.org_id
  all_users_ingress_tag_key        = var.all_users_ingress_tag_key
  all_users_ingress_tag_value      = var.all_users_ingress_tag_value
  region                           = var.region
  cloudbuild_apps_sa_email         = module.iam.cloudbuild_apps_sa_email
  api_sa_email                     = module.iam.api_sa_email
  api_domain_name                  = var.api_domain_name
  artifact_registry_kms_crypto_key = module.kms.artifact_registry_kms_crypto_key
  monitoring_alerts_emails         = var.monitoring_alerts_emails
  sourcerepo_name                  = var.sourcerepo_name
  sourcerepo_branch_name           = var.sourcerepo_branch_name
  tfstate_bucket                   = google_storage_bucket.tfstate.name
}
