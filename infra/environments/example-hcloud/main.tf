# Example Hetzner environment for the OpenThrottle stack.
#
# Unlike environments/production-hcloud, the module call below is NOT commented
# out. That is deliberate: it makes `terraform validate` in CI type-check the
# application module's interface on every change, so a variable renamed in
# applications/openthrottle_hcloud fails here rather than the first time someone
# tries to deploy.
#
# Nothing is applied by validating — CI runs `init -backend=false` + `validate`,
# which never contacts Hetzner.
#
# https://registry.terraform.io/providers/hetznercloud/hcloud/latest/docs
#
# The token is read from HCLOUD_TOKEN rather than declared as a variable, so it
# cannot end up in a tfvars file by accident.
provider "hcloud" {}

module "openthrottle" {
  source = "../../applications/openthrottle_hcloud"

  api_domain       = var.api_domain
  developer_domain = var.developer_domain
  env_name         = var.env_name

  # Renders the compose stack + cloud-init and attaches the 80/443 firewall.
  deploy_enabled = true

  # Pin exact tags. All four images must exist at this tag; a migrations image
  # from a different commit than the server is how a schema/code mismatch
  # reaches production.
  developer_image  = "${var.image_registry}/openthrottle-developer:${var.image_tag}"
  mcp_image        = "${var.image_registry}/mcp:${var.image_tag}"
  migrations_image = "${var.image_registry}/migrations:${var.image_tag}"
  server_image     = "${var.image_registry}/openthrottle-server:${var.image_tag}"

  location    = var.location
  server_type = var.server_type

  # Hetzner snapshots. Necessary but NOT sufficient on their own — pair them
  # with backup_remote below.
  backups_enabled = true
  backup_remote   = var.backup_remote

  data_volume_size_gb = var.data_volume_size_gb

  ssh_allowed_cidrs = var.ssh_allowed_cidrs
  ssh_key_ids       = var.ssh_key_ids

  # NOT SET, on purpose:
  #
  #   jwt_secret        — empty means the box generates one at first boot and
  #   postgres_password   persists it to a root-only file, so neither ever
  #                       enters Terraform state or cloud-init user_data (which
  #                       is readable via the Hetzner API for the life of the
  #                       server). Supply these ONLY when something off-box must
  #                       know them, i.e. after moving Postgres off the box.
  #                       See applications/openthrottle_hcloud/SECRETS.md.
  #
  #   ghcr_username     — leave unset while the packages are public. Anonymous
  #   ghcr_token          pulls then need no credential, which keeps user_data
  #                       free of secrets entirely.
  #
  #   postgres_host     — default to the on-box containers. Override these to
  #   redis_host          move Postgres or Redis off the box with no application
  #                       change (SCALING.md rung 2b).
  #
  #   mcp_domain        — empty keeps the MCP transport reachable only on the
  #                       compose network. It is guarded solely by
  #                       OPENTHROTTLE_MCP_AUTH_TOKEN, so publish it only if a
  #                       remote MCP client genuinely needs to reach this box.
}
