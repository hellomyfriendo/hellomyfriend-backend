variable "project_id" {
  type        = string
  description = "The project ID."
}

variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
}

variable "backend_image" {
  type        = string
  description = "The name of the Backend Artifact Registry Docker image."
}

variable "backend_service_account_email" {
  type        = string
  description = "The email of the backend service account."
}

variable "alerting_emails" {
  type        = string
  description = "Comma-separated list of email addresses that will receive monitoring alerts."
}
