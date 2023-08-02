variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
}

variable "backend_image" {
  type        = string
  description = "The name of the Backend Artifact Registry Docker image."
}

variable "backend_service_account_email" {
  type        = string
  description = "The email of the backend service account."
}

variable "domain_name" {
  type        = string
  description = "The domain name."
}

variable "external_https_lb_ip_address" {
  type        = string
  description = "IP address for which the external HTTPS load balancer accepts traffic."
}
