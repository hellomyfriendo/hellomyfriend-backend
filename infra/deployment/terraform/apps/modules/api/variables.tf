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

variable "api_domain_name" {
  type        = string
  description = "The API domain name."
}

variable "api_external_https_lb_ip_address" {
  type        = string
  description = "IP address of the API external HTTPS load balancer."
}
