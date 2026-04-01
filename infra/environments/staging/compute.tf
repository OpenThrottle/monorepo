# resource "{resource_type}" "{resource_name}"
resource "google_compute_network" "vpc_network" {
  auto_create_subnetworks = "true"
  description             = "A VPC network created with Terraform"
  name                    = "openthrottle-staging-network"
}

