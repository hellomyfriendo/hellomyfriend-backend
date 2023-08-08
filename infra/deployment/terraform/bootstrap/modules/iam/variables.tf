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

variable "artifact_registry_kms_crypto_key" {
  type        = string
  description = "The Artifact Registry KMS crypto key."
}

variable "terraform_tfvars_secret_kms_crypto_key" {
  type        = string
  description = "The terraform tfvars secret KMS crypto key."
}

variable "sourcerepo_name" {
  type        = string
  description = "The Cloud Source Repository name."
}

variable "tfstate_bucket" {
  type        = string
  description = "The GCS bucket to store the project's terraform state."
}
