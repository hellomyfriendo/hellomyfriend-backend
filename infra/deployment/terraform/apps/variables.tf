variable "org_id" {
  type        = string
  description = " The numeric ID of the organization."
}

variable "project_id" {
  type        = string
  description = "The project ID."
}

variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
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

variable "monitoring_alerts_emails" {
  type        = string
  description = "Comma-separated list of email addresses that will receive monitoring alerts."
}
