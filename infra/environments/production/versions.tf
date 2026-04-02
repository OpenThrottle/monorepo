terraform {
  backend "gcs" {
    bucket = "openthrottle-production-terraform-state"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "7.4.0"
    }
  }
}
