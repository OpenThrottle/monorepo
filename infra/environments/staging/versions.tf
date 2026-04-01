terraform {
  backend "gcs" {
    bucket = "mattscholta-terraform-state"
    # prefix = "staging"
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
