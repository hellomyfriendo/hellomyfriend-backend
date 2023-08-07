provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

module "project" {
  source = "./modules/project"

  region = var.region
}

module "iam" {
  source = "./modules/iam"

  org_id                      = var.org_id
  all_users_ingress_tag_key   = var.all_users_ingress_tag_key
  all_users_ingress_tag_value = var.all_users_ingress_tag_value
  bootstrap_kms_key_ring      = module.project.bootstrap_kms_key_ring
  sourcerepo_name             = var.sourcerepo_name
  tfstate_bucket              = module.project.tfstate_bucket
}

module "firestore" {
  source = "./modules/firestore"

  location_id = var.region

  depends_on = [module.project]
}

module "apps" {
  source = "./modules/apps"

  org_id                           = var.org_id
  all_users_ingress_tag_key        = var.all_users_ingress_tag_key
  all_users_ingress_tag_value      = var.all_users_ingress_tag_value
  region                           = var.region
  api_sa_email                     = module.iam.api_sa_email
  api_domain_name                  = var.api_domain_name
  artifact_registry_kms_crypto_key = module.iam.artifact_registry_kms_crypto_key
  cloudbuild_apps_sa_email         = module.iam.cloudbuild_apps_sa_email
  monitoring_alerts_emails         = var.monitoring_alerts_emails
  sourcerepo_name                  = var.sourcerepo_name
  sourcerepo_branch_name           = var.sourcerepo_branch_name
  tfstate_bucket                   = module.project.tfstate_bucket
}

# tfvars secret
resource "google_secret_manager_secret" "tfvars" {
  secret_id = "terraform-tfvars"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [
    module.project
  ]
}

resource "google_secret_manager_secret_version" "tfvars" {
  secret      = google_secret_manager_secret.tfvars.id
  secret_data = file("${path.module}/terraform.tfvars")
}
