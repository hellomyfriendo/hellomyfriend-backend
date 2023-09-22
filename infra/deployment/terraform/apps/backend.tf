terraform {
  backend "gcs" {
    bucket = "f1db3dea-7aab-77ab-416d-4acfa259b3b9" # This needs to be passed as backend-config.
    prefix = "apps"
  }
}
