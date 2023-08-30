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

variable "project_id" {
  type        = string
  description = "The project ID."
}

variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
}

variable "api_domain_name" {
  type        = string
  description = "The API domain name."
}

variable "developers_group_email" {
  type        = string
  description = "Developers group email."
}

variable "monitoring_alerts_emails" {
  type        = list(string)
  description = "Email addresses that will receive monitoring alerts."
}

variable "oauth2_client_id" {
  type        = string
  description = "The OAuth2 client ID."
}

variable "sourcerepo_name" {
  type        = string
  description = "The Cloud Source Repository name."
}

variable "sourcerepo_branch_name" {
  type        = string
  description = "The Cloud Source repository branch name."
}
