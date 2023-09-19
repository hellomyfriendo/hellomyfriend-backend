variable "org_id" {
  type        = string
  description = " The numeric ID of the organization."
}

variable "all_users_ingress_tag_value_id" {
  type        = string
  description = "The allUsersIngress tag value ID."
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

variable "project_id" {
  type        = string
  description = "The project ID."
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

variable "api_image" {
  type        = string
  description = "The name of the API Artifact Registry Docker image."
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

variable "monitoring_alerts_emails" {
  type        = string
  description = "Comma-separated list of email addresses that will receive monitoring alerts."
}
