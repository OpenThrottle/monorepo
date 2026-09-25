################################################################################
#
# OpenThrottle application module (Hetzner Cloud) — main.
#
# Composes a single hcloud_server running the entire stack: Caddy, server,
# developer, mcp, Postgres and Redis. The GCP sibling
# (applications/openthrottle) instead composes Compute E2 + Cloud SQL +
# Memorystore, because there Postgres and Redis are managed services.
#
# That is the whole structural difference between the two paths, and it is why
# this module has no database or cache resources of its own: they are containers
# described by templates/docker-compose.yml.tpl.
#
# Module sources are relative to this application (../../modules).
#
# See infra/provider-contract.md for the shared variable contract, and
# infra/hetzner-topology.md for sizing and the scaling ladder.
#
################################################################################

locals {
  # Resource-name prefix. env_name names the ENVIRONMENT, never the provider, so
  # names read openthrottle-production-* on either path.
  name_prefix = "openthrottle-${var.env_name}"

  # Where the Postgres data directory lives on the host. The compose template
  # bind-mounts this, so it has ONE shape whether the data sits on an attached
  # block volume or on the boot disk — the storage rung is decided here, not in
  # the template.
  #
  # When a volume is attached, cloud-init mounts it at the PARENT of this path
  # (/mnt/openthrottle-data), so the data directory itself is a subdirectory of
  # the mount rather than the mount point. That avoids handing Postgres a
  # freshly-mounted filesystem whose lost+found it would refuse to initialize
  # into.
  postgres_data_dir = var.data_volume_size_gb > 0 ? "/mnt/openthrottle-data/postgres" : "${local.app_dir}/postgres-data"

  app_dir = "/opt/openthrottle"

  caddyfile = templatefile("${path.module}/templates/Caddyfile.tpl", {
    api_domain       = var.api_domain
    developer_domain = var.developer_domain
    mcp_domain       = var.mcp_domain
  })

  compose_content = templatefile("${path.module}/templates/docker-compose.yml.tpl", {
    caddy_image       = var.caddy_image
    developer_image   = var.developer_image
    mcp_image         = var.mcp_image
    migrations_image  = var.migrations_image
    postgres_data_dir = local.postgres_data_dir
    postgres_image    = var.postgres_image
    redis_image       = var.redis_image
    server_image      = var.server_image
  })

  # The backup script is shipped verbatim onto the box rather than duplicated in
  # the template, so databases/backup-offsite.sh stays the single source of truth
  # and can be tested locally (see databases/SEEDING.md).
  backup_script = file("${path.module}/../../../databases/backup-offsite.sh")

  startup_script = var.deploy_enabled ? templatefile("${path.module}/templates/startup.sh.tpl", {
    api_domain             = var.api_domain
    backup_remote          = var.backup_remote
    backup_retention_count = tostring(var.backup_retention_count)
    backup_script          = local.backup_script
    caddyfile_content      = local.caddyfile
    compose_content        = local.compose_content
    developer_domain       = var.developer_domain

    # Empty string when no volume is attached; the script then skips the mount
    # and leaves Postgres on the boot disk.
    data_volume_device = var.data_volume_size_gb > 0 ? module.server.data_volume_device : ""

    ghcr_token    = var.ghcr_token
    ghcr_username = var.ghcr_username

    # Empty means "generate on the box" — see SECRETS.md. Passing a value here
    # puts it in user_data, which the Hetzner API exposes.
    jwt_secret        = var.jwt_secret
    postgres_password = var.postgres_password

    postgres_data_dir = local.postgres_data_dir
    postgres_db       = var.postgres_db_name
    postgres_host     = var.postgres_host
    postgres_port     = tostring(var.postgres_port)
    postgres_user     = var.postgres_user
    redis_host        = var.redis_host
    redis_port        = tostring(var.redis_port)
  }) : ""
}

module "server" {
  source = "../../modules/hcloud_server"

  backups_enabled     = var.backups_enabled
  data_volume_size_gb = var.data_volume_size_gb
  http_source_ips     = var.http_source_ips
  image               = var.server_image_os
  labels              = var.labels
  location            = var.location
  name                = local.name_prefix
  server_type         = var.server_type
  ssh_allowed_cidrs   = var.ssh_allowed_cidrs
  ssh_key_ids         = var.ssh_key_ids

  # The firewall is what makes 80/443 (and only 80/443, plus scoped SSH)
  # reachable. Attaching it only when deploying mirrors the GCP module, which
  # likewise creates its firewall rule under deploy_enabled.
  firewall_enabled = var.deploy_enabled

  user_data = local.startup_script
}
