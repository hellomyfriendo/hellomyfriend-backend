terraform {
  required_providers {
    google = {
      version = "4.73.1"
      source  = "hashicorp/google"
    }
    google-beta = {
      version = "4.73.1"
      source  = "hashicorp/google-beta"
    }
    docker = {
      source  = "kreuzwerker/docker"
      version = "3.0.2"
    }
  }
}
