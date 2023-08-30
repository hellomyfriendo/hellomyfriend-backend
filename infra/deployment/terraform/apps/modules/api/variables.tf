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

variable "confidential_kms_crypto_key" {
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

variable "external_https_load_balancer_backend_service_name" {
  type        = string
  description = "The name of the external HTTPS load balancer backend service that will distribute traffic to the Cloud Run service. See https://cloud.google.com/load-balancing/docs/backend-service."
}
