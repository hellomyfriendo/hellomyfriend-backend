variable "project_id" {
  type        = string
  description = "The project ID."
}

variable "region" {
  type        = string
  description = "The default Google Cloud region for the created resources."
}

variable "backend_image" {
  type        = string
  description = "The name of the Backend Artifact Registry Docker image."
}
