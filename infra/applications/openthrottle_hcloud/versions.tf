# Provider requirement for this application module.
#
# Required for the same reason as modules/hcloud_server/versions.tf: `hcloud` is
# a partner provider (hetznercloud/hcloud), not hashicorp/hcloud, and
# terraform-validate.yml initializes every directory containing *.tf on its own.
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.54"
    }
  }
}
