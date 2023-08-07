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
