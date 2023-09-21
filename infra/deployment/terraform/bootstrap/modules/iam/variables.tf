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

variable "developers_group_email" {
  type        = string
  description = "Developers group email."
}

variable "sourcerepo_name" {
  type        = string
  description = "The Cloud Source Repository name."
}
