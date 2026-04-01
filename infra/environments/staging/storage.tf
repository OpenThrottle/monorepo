resource "google_storage_bucket" "mattscholta_terraform_state" {
  location                    = "US"
  name                        = "mattscholta-terraform-state"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  lifecycle {
    prevent_destroy = true
  }
}

# Upload a text file as an object to the storage bucket
resource "google_storage_bucket_object" "default" {
  bucket       = google_storage_bucket.mattscholta_terraform_state.id
  content_type = "text/plain"
  name         = "README.md"
  source       = "../../README.md"

  lifecycle {
    prevent_destroy = true
  }
}
