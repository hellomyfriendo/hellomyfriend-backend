variable "org_id" {
  type        = string
  description = " The numeric ID of the organization."
}

variable "all_users_ingress_tag_value_id" {
  type        = string
  description = "The allUsersIngress tag value ID."
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

variable "api_domain_name" {
  type        = string
  description = "The API domain name."
}

variable "api_external_https_lb_ip_address" {
  type        = string
  description = "IP address of the API external HTTPS load balancer."
}
