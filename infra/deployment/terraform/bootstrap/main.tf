provider "google" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
}

provider "google-beta" {
  project               = var.project_id
  region                = var.region
  user_project_override = true
}

module "enable_apis" {
  source = "./modules/enable_apis"
}

# TODO(Marcus): remove this exceptions when I can pay for them
module "org_policy_exceptions" {
  source = "./modules/org_policy_exceptions"
}

module "iam" {
  source = "./modules/iam"

  org_id                      = var.org_id
  all_users_ingress_tag_key   = var.all_users_ingress_tag_key
  all_users_ingress_tag_value = var.all_users_ingress_tag_value
  developers_group_email      = var.developers_group_email
  sourcerepo_name             = var.sourcerepo_name
}

module "apps" {
  source = "./modules/apps"

  org_id                      = var.org_id
  all_users_ingress_tag_key   = var.all_users_ingress_tag_key
  all_users_ingress_tag_value = var.all_users_ingress_tag_value
  region                      = var.region
  api_sa_email                = module.iam.api_sa_email
  monitoring_alerts_emails    = var.monitoring_alerts_emails
  sourcerepo_name             = var.sourcerepo_name
  sourcerepo_branch_name      = var.sourcerepo_branch_name
  tfstate_bucket              = google_storage_bucket.tfstate.name
}
