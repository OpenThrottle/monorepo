# OpenThrottle — production on Hetzner Cloud.
#
# STATUS: NOT ACTIVE. Like environments/staging/openthrottle.tf, the module block
# below is intentionally commented out. Nothing here has been applied: no Hetzner
# server exists, and no DNS record points at one.
#
# This is the Hetzner sibling of applications/openthrottle_gcp (GCP). Both providers
# are supported — see infra/provider-contract.md. Switching an environment
# between them is a change to `source` plus dropping the provider-specific
# variables; every variable in the contract's shared table carries over
# untouched. That is ladder rung 4.
#
# BEFORE ACTIVATING, in order:
#
#   1. Set HCLOUD_TOKEN, and create the SSH key in the Hetzner project. Copy
#      terraform.tfvars.example to terraform.tfvars (gitignored) and put your
#      admin IPs in it — they are the one input that must not be committed.
#   2. Confirm the images exist on GHCR at the SHA you are pinning. Note that
#      .github/workflows/openthrottle-docker.yml is currently DISABLED
#      (`if: false`), so a tag may not exist yet — see docs/monorepo/ci-cost.md.
#   3. Read infra/applications/openthrottle_hcloud/SECRETS.md. Leave jwt_secret
#      and postgres_password EMPTY so the box generates them itself; they then
#      never enter user_data (which the Hetzner API exposes) or Terraform state.
#   4. Establish what currently serves these hostnames, per
#      applications/openthrottle_hcloud/CUTOVER.md. The GCP composition has never
#      been applied, so "roll back to GCP" is NOT an available fallback.
#   5. After the first successful boot, run `docker compose run --rm bootstrap`
#      manually — `up` must never silently provision a database.
#   6. For the automated deploy, set the HETZNER_DEPLOY_* secrets and variables
#      listed in .github/workflows/hetzner-deploy.yml. HETZNER_DEPLOY_FIREWALL
#      is the module's deploy_firewall_name output.

# module "openthrottle" {
#   source = "../../applications/openthrottle_hcloud"
#
#   api_domain       = "api.openthrottle.ai"
#   developer_domain = "developer.openthrottle.ai"
#   env_name         = local.project_env
#   location         = local.project_location
#
#   deploy_enabled   = true
#   developer_image  = "ghcr.io/openthrottle/openthrottle-developer:sha-REPLACE"
#   mcp_image        = "ghcr.io/openthrottle/mcp:sha-REPLACE"
#   migrations_image = "ghcr.io/openthrottle/migrations:sha-REPLACE"
#   server_image     = "ghcr.io/openthrottle/openthrottle-server:sha-REPLACE"
#
#   # Rung 0 sizing decision — see infra/hetzner-topology.md. Expect CPU, not
#   # RAM, to be what eventually forces cx33.
#   server_type = "cx23"
#
#   # 0 keeps Postgres on the boot disk, which is enough at rung 0. Set it (>= 10)
#   # to make storage scale independently of server_type and survive a rebuild.
#   data_volume_size_gb = 0
#
#   backups_enabled = true
#   backup_remote   = "" # rclone remote; EMPTY MEANS NO OFFSITE BACKUPS
#
#   # Hetzner has no default VPC rules to inherit. Your admin IPs come from the
#   # gitignored terraform.tfvars, never from this public file — see
#   # variables.tf. 0.0.0.0/0 is rejected by the module's own validation.
#   ssh_allowed_cidrs = var.ssh_allowed_cidrs
#   ssh_key_ids       = [] # e.g. ["admin-key"]
#
#   # GitHub-hosted runners have no stable IP to put in ssh_allowed_cidrs, so
#   # the deploy workflow opens this (otherwise empty) firewall for its own /32
#   # for the length of a run.
#   deploy_firewall_enabled = true
# }
