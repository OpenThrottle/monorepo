terraform {
  # NOTE: This bucket must be created first, then we can migrate the state into it
  backend "gcs" {
    bucket = "openthrottle-staging-terraform-state"
  }

  # https://registry.terraform.io/browse/providers
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.10.1"
    }

    google = {
      source  = "hashicorp/google"
      version = "7.4.0"
    }

    terracurl = {
      source  = "devops-rob/terracurl"
      version = "2.0.0"
    }
  }
}
