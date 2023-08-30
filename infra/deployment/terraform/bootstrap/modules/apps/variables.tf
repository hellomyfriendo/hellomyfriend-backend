variable "org_id" {
  type        = string
  description = " The numeric ID of the organization."
}

variable "all_users_ingress_tag_key" {
  type        = string
  description = "The allUsersIngress tag key short name."
}

variable "all_users_ingress_tag_value" {
  type        = string
  description = "The allUsersIngress tag value short name."
}

variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
}

variable "public_kms_crypto_key" {
  type        = string
  description = "The Public KMS crypto key."
}

variable "internal_kms_crypto_key" {
  type        = string
  description = "The Internal KMS crypto key."
}

variable "confidential_kms_crypto_key" {
  type        = string
  description = "The Confidential KMS crypto key."
}

variable "restricted_kms_crypto_key" {
  type        = string
  description = "The Confidential KMS crypto key."
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

variable "oauth2_client_id" {
  type        = string
  description = "The client id of an OAuth client."
}

variable "oauth2_client_secret" {
  type        = string
  description = "The client secret of an OAuth client."
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


