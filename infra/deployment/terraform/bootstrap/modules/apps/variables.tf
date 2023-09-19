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

variable "shared_vpc_network_name" {
  type        = string
  description = "The Shared VPC network name."
}

# TODO(Marcus): Learn more about subnetwork planning in shared VPC
variable "api_subnetwork_name" {
  type        = string
  description = "The name of the Shared VPC subnetwork in which the API and it's connected resources will be attached to."
}

variable "api_vpcaccess_connector_ip_cidr_range" {
  type        = string
  description = "The API VPC Access Connector IP CIDR range. See https://cloud.google.com/vpc/docs/serverless-vpc-access#ip_address_ranges."
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


