resource "google_storage_bucket" "nx_cache" {
  location                    = "US"
  name                        = "${local.project_name}-nx-cache"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  lifecycle {
    prevent_destroy = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age                = 90
      num_newer_versions = 10 # Keep the last 10 versions
    }
  }
}

resource "google_storage_bucket" "terraform_state" {
  location                    = "US"
  name                        = "${local.project_name}-terraform-state"
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true

  lifecycle {
    prevent_destroy = true
  }

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 90
    }
  }
}

# # Upload a text file as an object to the storage bucket
# resource "google_storage_bucket_object" "default" {
#   bucket       = google_storage_bucket.terraform_state.id
#   content_type = "text/plain"
#   name         = "README.md"
#   source       = "../../README.md"

#   lifecycle {
#     prevent_destroy = true
#   }
# }
