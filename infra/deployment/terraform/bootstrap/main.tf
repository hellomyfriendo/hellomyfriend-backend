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

  project_id = var.project_id

  depends_on = [module.project]
}

module "firestore" {
  source = "./modules/firestore"

  location_id = var.region

  depends_on = [module.project]
}

module "apps" {
  source = "./modules/apps"

  project_id                    = var.project_id
  region                        = var.region
  backend_service_account_email = module.iam.backend_service_account_email
  alerting_emails               = var.alerting_emails
  domain_name                   = var.domain_name
  sourcerepo_name               = var.sourcerepo_name
  branch_name                   = var.branch_name
  tfstate_bucket                = module.project.tfstate_bucket
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
