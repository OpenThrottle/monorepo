################################################################################
#
#   OpenThrottle application module — variables.
#
################################################################################

################################################################################
# Required environment variables
################################################################################

variable "env_name" {
  description = "Environment name or prefix used in resource names (e.g. staging, production)."
  type        = string
}

variable "network" {
  description = "VPC network id or self_link for instances and Redis peering."
  type        = string
}

variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "GCP region for OpenThrottle resources (e.g. us-west1)."
  type        = string
}

variable "zone" {
  description = "GCP zone for Compute Engine (e.g. us-west1-a)."
  type        = string
}

################################################################################
# Compute Engine - Optional overrides
################################################################################

variable "compute_disk_size_gb" {
  default     = 10
  description = "Compute Engine E2 boot disk size in GB. 10 GB matches the module default and leaves headroom for the server + developer + Caddy images pulled during `docker compose pull`; 2 GB risks filling the disk."
  type        = number
}

variable "compute_machine_type" {
  default     = "e2-micro"
  description = "Compute Engine machine type (e.g. e2-micro)."
  type        = string
}

################################################################################
# Cloud SQL PostgreSQL - Optional overrides
################################################################################

variable "postgres_disk_size_gb" {
  default     = 10
  description = "Cloud SQL PostgreSQL disk size in GB."
  type        = number
}

variable "postgres_disk_type" {
  default     = "PD_HDD"
  description = "Cloud SQL disk type: PD_SSD or PD_HDD."
  type        = string
}

variable "postgres_public_ip_enabled" {
  default     = false
  description = "Whether Cloud SQL has a public IPv4 address. Defaults to false; prefer private IP. When enabled, postgres_ssl_mode enforces encryption and postgres_authorized_networks restricts source ranges."
  type        = bool
}

variable "postgres_ssl_mode" {
  default     = "ENCRYPTED_ONLY"
  description = "Cloud SQL SSL enforcement mode (ENCRYPTED_ONLY, TRUSTED_CLIENT_CERTIFICATE_REQUIRED, or ALLOW_UNENCRYPTED_AND_ENCRYPTED). Defaults to ENCRYPTED_ONLY so cleartext connections are rejected."
  type        = string
}

variable "postgres_authorized_networks" {
  default     = []
  description = "Allowlist of CIDR source ranges permitted to reach the Cloud SQL public IP: [{ name, value }]. Required when public IP is enabled; never use 0.0.0.0/0 (e.g. the E2 egress IP only)."
  type = list(object({
    name  = string
    value = string
  }))
}

variable "postgres_tier" {
  default     = "db-f1-micro"
  description = "Cloud SQL instance tier (e.g. db-f1-micro)."
  type        = string
}

################################################################################
# Memory Store Redis - Optional overrides
################################################################################

variable "redis_memory_size_gb" {
  default     = 1
  description = "Memorystore Redis memory size in GB."
  type        = number
}

variable "redis_tier" {
  default     = "BASIC"
  description = "Memorystore Redis tier: BASIC or STANDARD_HA."
  type        = string
}

################################################################################
# Deploy (Docker on E2) - optional
################################################################################

variable "deploy_enabled" {
  default     = false
  description = "When true, E2 gets startup script to run server + developer + Caddy via Docker Compose and firewall for 80/443."
  type        = bool

  validation {
    condition     = !var.deploy_enabled || (length(var.server_image) > 0 && length(var.developer_image) > 0)
    error_message = "When deploy_enabled is true, server_image and developer_image must be set."
  }

  validation {
    condition     = !var.deploy_enabled || (length(var.migrations_image) > 0 && length(var.mcp_image) > 0)
    error_message = "When deploy_enabled is true, migrations_image and mcp_image must be set. The migrations runner is the server's schema gate; without it the server can start against a stale schema."
  }
}

variable "artifact_registry_region" {
  default     = "us-west2"
  description = "Artifact Registry region (e.g. us-west2 for us-west2-docker.pkg.dev)."
  type        = string
}

variable "caddy_image" {
  default     = "caddy:2-alpine"
  description = "Caddy image for reverse proxy."
  type        = string
}

variable "developer_image" {
  default     = ""
  description = "Full image for openthrottle-developer. Required when deploy_enabled."
  type        = string
}

variable "api_domain" {
  # default     = "api.example.com"
  description = "Hostname for the API (Caddy routes this to openthrottle-server)."
  type        = string
}

variable "developer_domain" {
  # default     = "developer.example.com"
  description = "Hostname for the developer app (Caddy routes this to openthrottle-developer)."
  type        = string
}

variable "postgres_db_name" {
  default     = "openthrottle"
  description = "Cloud SQL database name (POSTGRES_DB)."
  type        = string
}

variable "postgres_user" {
  default     = "openthrottle"
  description = "Cloud SQL user (POSTGRES_USER)."
  type        = string
}

variable "postgres_password" {
  default     = ""
  description = "Cloud SQL password (POSTGRES_PASSWORD). Sensitive; prefer Secret Manager when available."
  type        = string
  sensitive   = true
}

variable "migrations_image" {
  default     = ""
  description = "Full image for the one-shot migrations runner. Required when deploy_enabled: without it the server has NO schema gate and will start against whatever schema Cloud SQL happens to have. Must carry the SAME sha tag as server_image — a migrations image from a different commit is how a schema/code mismatch reaches production."
  type        = string
}

variable "mcp_image" {
  default     = ""
  description = "Full image for openthrottle-mcp (streamable HTTP transport). Required when deploy_enabled."
  type        = string
}

variable "mcp_domain" {
  default     = ""
  description = "Optional hostname for the openthrottle-mcp transport. Empty (the default) keeps mcp reachable only on the compose network, which is the safer default: it is guarded solely by OPENTHROTTLE_MCP_AUTH_TOKEN."
  type        = string
}

variable "jwt_secret" {
  default     = ""
  description = "HS256 secret for issuing and verifying JWTs, written to .env as JWT_SECRET. The server HARD-REQUIRES it — jwt.strategy.ts throws at boot without it and rejects anything under 32 bytes. EMPTY IS RECOMMENDED: the startup script then generates one on the instance and persists it, so it never appears in instance metadata (readable with compute.instances.get) or in Terraform state. Never use the .env.default value; it is a published 32-byte string."
  sensitive   = true
  type        = string
}

variable "postgres_ssl_reject_unauthorized" {
  default     = false
  description = "Whether to verify the Postgres server certificate chain. Defaults to FALSE because Cloud SQL presents a certificate signed by a per-instance CA that is not in the public trust store, so verification fails unless that CA is installed on the instance. Set true once you distribute the instance's server-ca.pem — that is the stronger configuration, and this default trades it for a connection that works out of the box."
  type        = bool
}

variable "ssh_allowed_cidrs" {
  default     = []
  description = "Source ranges permitted to reach port 22 on the instance. Previously this module defined NO SSH rule at all and relied on the VPC's default rules, which is only safe if you have verified those defaults do not expose 22 to the internet. An empty list creates no rule and preserves that old inherited behaviour; setting it creates an explicit, scoped rule. 0.0.0.0/0 is rejected by validation."
  type        = list(string)

  validation {
    condition     = !contains(var.ssh_allowed_cidrs, "0.0.0.0/0")
    error_message = "ssh_allowed_cidrs must not open SSH to the whole internet. Scope it to known administrative ranges, or leave it empty to inherit the VPC's rules."
  }
}

variable "server_image" {
  default     = ""
  description = "Full image for openthrottle-server (e.g. us-west2-docker.pkg.dev/PROJECT/openthrottle/openthrottle-server:sha-xxx). Required when deploy_enabled."
  type        = string
}
