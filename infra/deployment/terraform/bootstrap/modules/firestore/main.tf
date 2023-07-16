resource "google_firestore_database" "database" {
  name        = "(default)"
  location_id = var.location_id
  type        = "FIRESTORE_NATIVE"
}
