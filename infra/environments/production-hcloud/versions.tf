terraform {
  # Reuses the EXISTING production state bucket under its own prefix. No state is
  # migrated — GCP stays supported, so its state stays where it is, and a botched
  # state move is the most damaging failure available here.
  #
  # The prefix is what keeps the two roots independent inside one bucket: a
  # `terraform destroy` of this root can never reach GCP state. Rationale and the
  # one condition that would justify a separate backend are in
  # infra/provider-contract.md § "State backend".
  backend "gcs" {
    bucket = "openthrottle-production-terraform-state"
    prefix = "openthrottle/production-hcloud"
  }

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.54"
    }
  }
}
