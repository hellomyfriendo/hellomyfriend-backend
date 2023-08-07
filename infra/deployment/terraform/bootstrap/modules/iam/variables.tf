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

variable "bootstrap_kms_key_ring" {
  type        = string
  description = "The bootstrap KMS key ring."
}

variable "sourcerepo_name" {
  type        = string
  description = "The Cloud Source Repository name."
}

variable "tfstate_bucket" {
  type        = string
  description = "The GCS bucket to store the project's terraform state."
}
