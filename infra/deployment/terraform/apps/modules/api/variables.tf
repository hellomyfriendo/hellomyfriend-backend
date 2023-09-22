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

variable "api_image" {
  type        = string
  description = "The name of the API Artifact Registry Docker image."
}

variable "api_sa_email" {
  type        = string
  description = "The email of the API service account."
}

variable "api_network_name" {
  type        = string
  description = "VPC network to attach API resources to."
}

variable "api_database_allocated_ip_range" {
  type        = string
  description = "The database allocated IP range."
}

variable "vpc_access_connector_id" {
  type        = string
  description = "The ID of the VPC Access connector to use."
}