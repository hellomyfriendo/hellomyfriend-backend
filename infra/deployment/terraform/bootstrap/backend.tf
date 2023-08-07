terraform {
  backend "gcs" {
    bucket = "ideally-constantly-driving-buck"
    prefix = "bootstrap"
  }
}
