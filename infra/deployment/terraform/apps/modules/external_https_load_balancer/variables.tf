variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
}

variable "name" {
  type        = string
  description = "Name for the forwarding rule and prefix for supporting resources."
}

variable "ip_address" {
  type        = string
  description = "Existing IPv4 address to use for the external HTTPS load balancer (the actual IP address value)."
}

variable "api_domain_name" {
  type        = string
  description = "The API domain name."
}

variable "api_service_name" {
  type        = string
  description = "The API Cloud Run service name."
}

variable "oauth2_client_id" {
  type        = string
  description = "The client id of an OAuth client."
}

variable "oauth2_client_secret_secret_id" {
  type        = string
  description = "The ID of the Secret Manager secret containing the client secret of an OAuth client."
}