# https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs
#
# The token is read from HCLOUD_TOKEN rather than being declared as a variable,
# so it cannot be written into a tfvars file by accident.
provider "hcloud" {}
