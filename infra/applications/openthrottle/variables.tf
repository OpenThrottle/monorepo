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

variable "server_image" {
  default     = ""
  description = "Full image for openthrottle-server (e.g. us-west2-docker.pkg.dev/PROJECT/openthrottle/openthrottle-server:sha-xxx). Required when deploy_enabled."
  type        = string
}
