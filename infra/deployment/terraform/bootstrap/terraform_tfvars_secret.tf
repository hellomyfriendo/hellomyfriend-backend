resource "google_secret_manager_secret" "terraform_tfvars" {
  secret_id = "terraform-tfvars"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [
    module.iam
  ]
}

resource "google_secret_manager_secret_version" "terraform_tfvars" {
  secret      = google_secret_manager_secret.terraform_tfvars.id
  secret_data = file("${path.module}/terraform.tfvars")
}
