variable "project_id" {
  type        = string
  description = "The project ID."
}

variable "alerting_emails" {
  type        = list(string)
  description = "Email addresses that will receive monitoring alerts."
}
