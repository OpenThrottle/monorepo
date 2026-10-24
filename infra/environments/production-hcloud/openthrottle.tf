# OpenThrottle — production on Hetzner Cloud.
#
# STATUS: ACTIVE CONFIGURATION, applied by hand. Nothing in CI applies this root;
# `terraform apply` is run from an operator's machine with HCLOUD_TOKEN set and
# a gitignored terraform.tfvars beside this file.
#
# This is the Hetzner sibling of applications/openthrottle_gcp (GCP). Both providers
# are supported — see infra/provider-contract.md. Switching an environment
# between them is a change to `source` plus dropping the provider-specific
# variables; every variable in the contract's shared table carries over
# untouched. That is ladder rung 4.
#
# Operator notes:
#
#   1. HCLOUD_TOKEN in the environment, never a variable. Copy
#      terraform.tfvars.example to terraform.tfvars (gitignored) and put your
#      admin IPs in it — they are the one input that must not be committed.
#   2. All four images must exist on GHCR at the pinned tag. Bump them together:
#      a migrations image from a different commit than the server is how a
#      schema/code mismatch reaches production. After the first boot, routine
#      image rolls go through .github/workflows/hetzner-deploy.yml instead —
#      user_data is ignore_changes, so editing a tag here does NOT reach a
#      running box.
#   3. jwt_secret and postgres_password are deliberately unset, so the box
#      generates them itself; they never enter user_data (which the Hetzner API
#      exposes) or Terraform state. See
#      infra/applications/openthrottle_hcloud/SECRETS.md.
#   4. backup_remote is baked into first-boot cloud-init for the same reason.
#      Changing it later means re-running the startup script over SSH
#      (/usr/local/sbin/openthrottle-startup.sh).
#   5. The GCP composition has never been applied, so "roll back to GCP" is NOT
#      an available fallback. See applications/openthrottle_hcloud/CUTOVER.md.
#   6. After the first successful boot, run `docker compose run --rm bootstrap`
#      manually — `up` must never silently provision a database.
#   7. For the automated deploy, set the HETZNER_* secrets and variables listed
#      in .github/workflows/hetzner-deploy.yml. HETZNER_DEPLOY_FIREWALL is the
#      deploy_firewall_name output.
#   8. Agents (claude/codex/gemini inside the server) are OFF. They are an
#      accepted-risk opt-in: an agent turn can read every server secret and
#      reach Postgres and Redis. Read SECRETS.md § "Agents on this box" before
#      uncommenting the agents_* lines below. GITHUB_TOKEN and the model API
#      keys are never Terraform variables: they go in agent-secrets.env on the
#      box. Enabling does not reach the running box by itself (user_data is
#      ignore_changes): see README.md § "Rolling a change out to an existing
#      box".

module "openthrottle" {
  source = "../../applications/openthrottle_hcloud"

  api_domain       = "api.openthrottle.ai"
  developer_domain = "developer.openthrottle.ai"
  env_name         = local.project_env
  location         = local.project_location

  deploy_enabled   = true
  developer_image  = "ghcr.io/openthrottle/openthrottle-developer:sha-dd7b6e5788290b6085efd1101ee4a694aa5c0034"
  mcp_image        = "ghcr.io/openthrottle/mcp:sha-dd7b6e5788290b6085efd1101ee4a694aa5c0034"
  migrations_image = "ghcr.io/openthrottle/migrations:sha-dd7b6e5788290b6085efd1101ee4a694aa5c0034"
  server_image     = "ghcr.io/openthrottle/openthrottle-server:sha-dd7b6e5788290b6085efd1101ee4a694aa5c0034"

  # Rung 0 sizing decision — see infra/hetzner-topology.md. Expect CPU, not
  # RAM, to be what eventually forces cx33.
  server_type = "cx23"

  # Postgres data on an attached volume from day one, so storage scales
  # independently of server_type and survives a server rebuild. Moving it off
  # the boot disk later would be a data migration, not a variable change.
  data_volume_size_gb = 10

  backups_enabled = true

  # rclone destination for the nightly offsite dump: remote `r2` (Cloudflare R2),
  # bucket `openthrottle-backups`. The remote's credentials are configured on the
  # box with `rclone config` after first boot — never here.
  backup_remote = "r2:openthrottle-backups"

  # Hetzner has no default VPC rules to inherit. Your admin IPs come from the
  # gitignored terraform.tfvars, never from this public file — see
  # variables.tf. 0.0.0.0/0 is rejected by the module's own validation.
  ssh_allowed_cidrs = var.ssh_allowed_cidrs

  # Must already exist in the Hetzner project. Set before the FIRST apply: the
  # provider installs SSH keys only when it creates the server.
  ssh_key_ids = ["openthrottle-admin", "openthrottle-ci-deploy"]

  # Agents: see note 8. server_agents_image is the sha-<sha>-agents tag of the
  # openthrottle-server repository, built from the same commit as the images
  # above. cx33 because the 1280m server limit does not fit alongside the rest
  # on a cx23.
  #
  # agents_enabled      = true
  # server_agents_image = "ghcr.io/openthrottle/openthrottle-server:sha-dd7b6e5788290b6085efd1101ee4a694aa5c0034-agents"

  # GitHub-hosted runners have no stable IP to put in ssh_allowed_cidrs, so
  # the deploy workflow opens this (otherwise empty) firewall for its own /32
  # for the length of a run.
  deploy_firewall_enabled = true
}
