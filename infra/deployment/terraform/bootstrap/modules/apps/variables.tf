variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
}

variable "artifact_registry_kms_crypto_key" {
  type        = string
  description = "The Artifact Registry KMS crypto key."
}

variable "api_sa_email" {
  type        = string
  description = "The email of the API service account."
}

variable "api_domain_name" {
  type        = string
  description = "The API domain name."
}

variable "cloudbuild_apps_sa_email" {
  type        = string
  description = "The email of the Cloud Build apps service account."
}

variable "monitoring_alerts_emails" {
  type        = list(string)
  description = "Email addresses that will receive monitoring alerts."
}

variable "sourcerepo_name" {
  type        = string
  description = "The Cloud Source Repository name."
}

variable "sourcerepo_branch_name" {
  type        = string
  description = "The Cloud Source repository branch name."
}

variable "tfstate_bucket" {
  type        = string
  description = "The GCS bucket to store the project's terraform state."
}


