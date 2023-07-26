variable "project_id" {
  type        = string
  description = "The project ID."
}

variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
}

variable "backend_service_account_email" {
  type        = string
  description = "The email of the backend service account."
}

variable "alerting_emails" {
  type        = list(string)
  description = "Email addresses that will receive monitoring alerts."
}

variable "sourcerepo_name" {
  type        = string
  description = "The Cloud Source Repository name."
}

variable "branch_name" {
  type        = string
  description = "The Cloud Source repository branch name."
}

variable "tfstate_bucket" {
  type        = string
  description = "The GCS bucket to store the project's terraform state."
}
