output "public_kms_crypto_key" {
  value = google_kms_crypto_key.public.id
}

output "internal_kms_crypto_key" {
  value = google_kms_crypto_key.internal.id
}

output "confidential_kms_crypto_key" {
  value = google_kms_crypto_key.confidential.id
}

output "restricted_kms_crypto_key" {
  value = google_kms_crypto_key.restricted.id
}
