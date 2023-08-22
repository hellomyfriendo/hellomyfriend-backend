variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
}

variable "ip_address" {
  type        = string
  description = "IP address of the API external HTTPS load balancer."
}

variable "api_domain_name" {
  type        = string
  description = "The API domain name."
}

variable "api_service_name" {
  type        = string
  description = "The API Cloud Run service name."
}