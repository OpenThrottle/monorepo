################################################################################
#
#   OpenThrottle application module (Hetzner Cloud) — variables.
#
#   SIBLING of applications/openthrottle (GCP), not a replacement. Both providers
#   are supported. The variable contract below is governed by
#   infra/provider-contract.md: variables that mean the same thing on both
#   providers MUST be spelled and typed identically, and variables meaningless
#   here are DROPPED rather than stubbed.
#
#   Deliberately absent (GCP-only — see the contract): project_id, network,
#   region, zone, compute_machine_type, compute_disk_size_gb, postgres_tier,
#   postgres_disk_size_gb, postgres_disk_type, postgres_public_ip_enabled,
#   postgres_ssl_mode, postgres_authorized_networks, redis_memory_size_gb,
#   redis_tier, artifact_registry_region.
#
#   A stubbed variable would be worse than an absent one: a no-op postgres_tier
#   here reads as supported, plans clean, and misleads whoever next sizes a
#   database. Postgres and Redis are CONTAINERS on this path — they are sized by
#   compose mem_limits, not by instance tiers.
#
################################################################################

################################################################################
# Shared contract — identical name, type and meaning on both providers.
# Changing one of these without changing the GCP module breaks ladder rung 4.
################################################################################

variable "env_name" {
  description = "Environment name or prefix used in resource names (e.g. staging, production)."
  type        = string
}

variable "api_domain" {
  description = "Hostname for the API (Caddy routes this to openthrottle-server)."
  type        = string
}

variable "developer_domain" {
  description = "Hostname for the developer app (Caddy routes this to openthrottle-developer)."
  type        = string
}

variable "caddy_image" {
  default     = "caddy:2-alpine"
  description = "Caddy image for reverse proxy."
  type        = string
}

variable "developer_image" {
  default     = ""
  description = "Full image for openthrottle-developer. Required when deploy_enabled. Registry-agnostic by design: the same sha-<GITHUB_SHA> tag resolves on GHCR or Artifact Registry, so only the prefix differs between providers."
  type        = string
}

variable "server_image" {
  default     = ""
  description = "Full image for openthrottle-server (e.g. ghcr.io/openthrottle/openthrottle-server:sha-xxx). Required when deploy_enabled."
  type        = string
}

variable "postgres_db_name" {
  default     = "openthrottle"
  description = "Database name (POSTGRES_DB)."
  type        = string
}

variable "postgres_user" {
  default     = "openthrottle"
  description = "Database user (POSTGRES_USER)."
  type        = string
}

variable "postgres_password" {
  default     = ""
  description = "Database password (POSTGRES_PASSWORD). EMPTY MEANS GENERATE ON THE BOX at first boot (idempotently, into a root-only file) so it never reaches user_data or Terraform state — see SECRETS.md. This is a deliberate divergence in MEANING from the GCP module, where Terraform must know the password to create the Cloud SQL instance; the name and type still match, so the shared contract holds. Supply a value for ladder rung 2, where Postgres moves off-box and something else must know it."
  sensitive   = true
  type        = string
}

variable "deploy_enabled" {
  default     = false
  description = "When true, render the compose stack + cloud-init and attach the 80/443 firewall."
  type        = bool

  validation {
    condition     = !var.deploy_enabled || (length(var.server_image) > 0 && length(var.developer_image) > 0)
    error_message = "When deploy_enabled is true, server_image and developer_image must be set."
  }

  # Separate from the check above so the error names the actually-missing image.
  # These two have no GCP counterpart, so this validation has no sibling to match.
  validation {
    condition     = !var.deploy_enabled || (length(var.migrations_image) > 0 && length(var.mcp_image) > 0)
    error_message = "When deploy_enabled is true, migrations_image and mcp_image must be set. The migrations runner is the server's schema gate; without it the server cannot start."
  }
}

################################################################################
# The rung-2 seam — moving Postgres (or Redis) off the box.
#
# THIS IS THE MOST LOAD-BEARING PART OF THIS FILE. The application reads
# POSTGRES_HOST / POSTGRES_PORT from its environment and never resolves the
# compose service name itself. These variables default to the on-box container
# and exist so they can later point at a second Hetzner box, a managed Postgres,
# or GCP Cloud SQL — a variable change, not a restructure.
#
# Do NOT hardcode "postgres" anywhere but these defaults.
################################################################################

variable "postgres_host" {
  default     = "postgres"
  description = "Host the server connects to for Postgres. Defaults to the on-box compose service name. Override to move Postgres off the box (ladder rung 2) with no application change. Constraint: the server holds long-lived connections (TypeORM pool, graphql-ws subscriptions, BullMQ), so a serverless pooler assuming short-lived connections is not a drop-in target."
  type        = string
}

variable "postgres_port" {
  default     = 5432
  description = "Port for Postgres. Defaults to the container port, NOT a published host port — the compose template deliberately publishes neither 5432 nor 6379."
  type        = number
}

variable "redis_host" {
  default     = "redis"
  description = "Host the server connects to for Redis. Defaults to the on-box compose service name; overridable for the same reason as postgres_host."
  type        = string
}

variable "redis_port" {
  default     = 6379
  description = "Port for Redis. Container port, not a published host port."
  type        = number
}

################################################################################
# Secrets.
#
# READ SECRETS.md BEFORE ADDING ANYTHING HERE.
#
# Hetzner user_data is readable via the Hetzner API for the life of the server
# and lands in plaintext on disk, so a secret interpolated into cloud-init is a
# secret published to anyone with API access. The design therefore keeps as much
# as possible OUT of Terraform entirely:
#
#   - jwt_secret and postgres_password default to "" meaning GENERATE ON THE BOX
#     at first boot, into a root-only 0600 file. They never enter user_data and
#     never enter Terraform state.
#   - OPENTHROTTLE_MCP_AUTH_TOKEN and the bootstrap user password are NOT
#     variables at all: they are supplied to the manual
#     `docker compose run --rm bootstrap` step over SSH.
#   - BULLMQ_BOARD_ADMIN_* are deliberately absent. isBullBoardEnabled() is
#     NODE_ENV !== "production", so the dashboard is off in production by
#     design; provisioning credentials for it would mean enabling something the
#     code intentionally keeps off.
################################################################################

variable "jwt_secret" {
  default     = ""
  description = "HS256 secret for issuing and verifying JWTs (written to .env as JWT_SECRET, which the server hard-requires — it throws at boot without it, and rejects anything under 32 bytes). EMPTY IS THE RECOMMENDED VALUE: cloud-init then generates a strong secret on first boot and persists it, so it never appears in user_data or Terraform state. Supply a value only when something off-box must verify the same tokens. Never use the .env.default value — it is a published 32-byte string in a public repository."
  sensitive   = true
  type        = string
}

variable "ghcr_username" {
  default     = ""
  description = "Username for `docker login ghcr.io`. Leave EMPTY when the GHCR packages are public, which is the recommended setup for a public repository: anonymous pulls then need no credential and user_data carries no secret at all."
  type        = string
}

variable "ghcr_token" {
  default     = ""
  description = "Read-only (read:packages) token for GHCR. Leave EMPTY for public packages. This is the ONE unavoidable user_data secret when packages are private, because pulling images must happen before anything else can run — so scope it to read:packages only and treat it as exposed to anyone with Hetzner API access."
  sensitive   = true
  type        = string
}

################################################################################
# Container images for the on-box services.
#
# hcloud-only: the GCP compose template renders only caddy + server + developer,
# because there Postgres and Redis are managed services and mcp is missing
# altogether (a known gap on that path — see the contract). These have no GCP
# counterpart to match.
#
# Pin exact tags. `sha-<GITHUB_SHA>` resolves identically on GHCR and Artifact
# Registry because images are built once and re-tagged per registry.
################################################################################

variable "migrations_image" {
  default     = ""
  description = "Full image for the one-shot migrations runner (e.g. ghcr.io/openthrottle/migrations:sha-xxx). Required when deploy_enabled: without it the server has no schema gate. Should carry the SAME sha tag as server_image — a migrations image from a different commit than the server is how a schema/code mismatch reaches production."
  type        = string
}

variable "mcp_image" {
  default     = ""
  description = "Full image for openthrottle-mcp (e.g. ghcr.io/openthrottle/mcp:sha-xxx). Required when deploy_enabled."
  type        = string
}

variable "postgres_image" {
  default     = "pgvector/pgvector:0.8.2-pg18-trixie"
  description = "Postgres image, which must ship pgvector. Defaults to the upstream prebuilt pgvector image rather than building applications/openthrottle/Dockerfile.Postgres: that Dockerfile COPYs databases/seed.sql and a deployed box has no checkout to build from. The -trixie tag matters — it matches the Debian 13 / glibc 2.41 base the existing data volumes were initialized with, and the default tag is Debian 12, which triggers a collation version mismatch."
  type        = string
}

variable "redis_image" {
  default     = "redis:8.8-alpine"
  description = "Redis image. Tracks REDIS_VERSION in .env.default."
  type        = string
}

################################################################################
# Hetzner-specific — no GCP counterpart (see the contract).
################################################################################

variable "server_type" {
  default     = "cx22"
  description = "Hetzner server type. Ladder rung 1: the single variable to change to scale vertically. Default cx22 is the sizing decision recorded in infra/hetzner-topology.md; expect CPU, not RAM, to be what forces an upgrade."
  type        = string
}

variable "location" {
  default     = "nbg1"
  description = "Hetzner location. Changing it after creation REPLACES the server, and a data volume cannot move between locations."
  type        = string
}

variable "server_image_os" {
  default     = "ubuntu-24.04"
  description = "Hetzner OS image for the box. Named server_image_os rather than `image` to avoid confusion with server_image (the container image for openthrottle-server), which is a genuinely different thing."
  type        = string
}

variable "backups_enabled" {
  default     = true
  description = "Hetzner automatic server backups (~20% of server cost). NOT a substitute for an offsite logical pg_dump: on this path Postgres is a container on the box, so backups are owned work rather than a managed-service feature."
  type        = bool
}

variable "data_volume_size_gb" {
  default     = 0
  description = "Attached block volume for the Postgres data directory, in GB. 0 keeps Postgres on a named Docker volume on the boot disk, which is sufficient at rung 0. Set it (minimum 10) so storage scales independently of server_type and survives an instance rebuild."
  type        = number
}

variable "backup_remote" {
  default     = ""
  description = "rclone destination for the nightly offsite database dump (e.g. \"hetzner-box:openthrottle/backups\" or \"s3remote:bucket/path\"). EMPTY DISABLES OFFSITE BACKUPS ENTIRELY — Hetzner snapshots alone share the server's fate for some failure modes, so an empty value means the only copy of the data lives on the machine it protects. This is a destination, not a credential: the credential lives in rclone's own config on the box, which is why it is safe to pass through cloud-init. The app's built-in scheduled backup CANNOT be used here (it spawns pnpm in a workspace checkout, which a distroless deployment does not have), so this is the only database backup on this path."
  type        = string
}

variable "backup_retention_count" {
  default     = 14
  description = "How many nightly archives to keep, locally and on the remote. Mirrors DATABASE_BACKUP_RETENTION_COUNT and scripts/openthrottle-database-backup.ts rather than introducing a second retention scheme."
  type        = number
}

variable "ssh_allowed_cidrs" {
  default     = []
  description = "Source ranges permitted to reach port 22. Hetzner has NO default VPC rules to inherit, unlike the GCP path, so this is explicit and 0.0.0.0/0 is rejected by the underlying module. Empty means no SSH ingress at all."
  type        = list(string)
}

variable "ssh_key_ids" {
  default     = []
  description = "Existing Hetzner SSH keys (id, name, or fingerprint) to install for root. This module does not create keys."
  type        = list(string)
}

variable "http_source_ips" {
  default     = ["0.0.0.0/0", "::/0"]
  description = "Source ranges permitted to reach 80/443. The internet by default: this is a public web endpoint, and Caddy needs port 80 reachable to answer the ACME HTTP-01 challenge. Narrow to a CDN's egress ranges to lock down the origin."
  type        = list(string)
}

variable "mcp_domain" {
  default     = ""
  description = "Optional hostname for the openthrottle-mcp streamable-HTTP transport. Empty (the default) keeps mcp reachable only on the compose network, which is the safer default: the MCP transport authenticates with OPENTHROTTLE_MCP_AUTH_TOKEN and exposing it publicly widens the surface. Set it only when a remote MCP client genuinely needs to reach this box."
  type        = string
}

variable "labels" {
  default     = {}
  description = "Labels applied to the server and data volume."
  type        = map(string)
}
