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

variable "shared_vpc_network_host" {
  type        = string
  description = "The Shared VPC network host project ID."
}

variable "shared_vpc_network_name" {
  type        = string
  description = "The Shared VPC network name."
}

variable "vpc_access_connector_id" {
  type        = string
  description = "The Shared VPC Access Connector to use."
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
  description = "The Restricted KMS crypto key."
}

variable "api_sa_email" {
  type        = string
  description = "The email of the API service account."
}

# TODO(Marcus): Learn more about subnetwork planning in shared VPC
variable "api_subnetwork_name" {
  type        = string
  description = "The name of the Shared VPC subnetwork in which the API and it's connected resources will be attached to."
}

variable "api_database_allocated_ip_range" {
  type        = string
  description = "The API database allocated IP CIDR range."
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


