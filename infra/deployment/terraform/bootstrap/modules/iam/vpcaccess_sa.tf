resource "google_project_service_identity" "vpcaccess" {
  provider = google-beta
  project  = data.google_project.project.project_id
  service  = "vpcaccess.googleapis.com"
}