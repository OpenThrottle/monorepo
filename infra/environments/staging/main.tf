# https://registry.terraform.io/providers/hashicorp/google/latest/docs
provider "google" {
  project = local.project_id
  region  = local.project_region
  zone    = local.project_zone
}

# https://registry.terraform.io/providers/devops-rob/terracurl/latest/docs
provider "terracurl" {}
