# Provider requirement for this module.
#
# Unlike the gcp_* modules, this one MUST declare required_providers: `google`
# resolves to hashicorp/google implicitly, but `hcloud` would resolve to a
# non-existent hashicorp/hcloud. CI validates every directory containing *.tf
# standalone (terraform-validate.yml walks `find infra -name '*.tf'`), so
# without this block `terraform init` fails here rather than in an environment.
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.54"
    }
  }
}
