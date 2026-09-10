################################################################################
#
# OpenThrottle application module — main.
# Composes reserved IP for Redis, Cloud SQL Postgres, Compute E2, Memorystore Redis.
# Module sources are relative to this application (../../modules from applications/openthrottle).
#
################################################################################

data "google_project" "project" {
  project_id = var.project_id
}

################################################################################
# Firewall: allow HTTP/HTTPS to the E2 instance (for Caddy reverse proxy).
#
# Intent: this is a PUBLIC web endpoint. Caddy on the E2 instance terminates TLS
# and reverse-proxies the server/developer apps by hostname, so opening tcp
# 80/443 to 0.0.0.0/0 is by design — anyone on the internet must be able to
# reach the site. This rule is scoped narrowly on purpose:
#   * It only targets instances tagged "openthrottle-http" (the E2 instance),
#     not every VM on the network.
#   * It only opens tcp 80 and 443. SSH is handled by a SEPARATE, opt-in rule
#     below (google_compute_firewall.allow_ssh), created only when
#     ssh_allowed_cidrs is non-empty. Leaving that variable empty preserves the
#     old behaviour of inheriting the VPC's default rules — which is only safe
#     if you have confirmed those defaults do not expose 22 to the internet.
#     Prefer setting ssh_allowed_cidrs, or use IAP.
#
# No rate-limit / WAF layer is applied at this firewall. If the public surface
# needs DDoS/WAF protection or origin lockdown, front the endpoint with
# Cloudflare or Google Cloud Armor and then restrict source_ranges below to the
# CDN/proxy egress ranges (e.g. Cloudflare IP ranges) instead of 0.0.0.0/0. A
# Cloudflare module is referenced in the repo README but is not yet present in
# modules/; adding it is a separate, larger change tracked outside this rule.
################################################################################
resource "google_compute_firewall" "allow_http_https" {
  name    = "openthrottle-${var.env_name}-allow-http-https"
  network = var.network
  project = var.project_id
  # 0.0.0.0/0 is intentional: public HTTP/HTTPS web endpoint (see comment above).
  # Narrow to CDN/proxy egress ranges if fronted by Cloudflare/Cloud Armor.
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["openthrottle-http"]

  allow {
    ports    = ["80", "443"]
    protocol = "tcp"
  }
}

################################################################################
# Firewall: scoped SSH (opt-in).
#
# This module used to define no SSH rule at all and rely on the VPC's default
# rules. That is fine only if those defaults are known-good; it is not something
# a module should silently assume. Setting ssh_allowed_cidrs creates an explicit
# rule scoped to those ranges, targeting only this instance's tag.
#
# 0.0.0.0/0 is rejected by the variable's validation, so this rule cannot be the
# thing that exposes SSH to the internet.
################################################################################
resource "google_compute_firewall" "allow_ssh" {
  count = var.deploy_enabled && length(var.ssh_allowed_cidrs) > 0 ? 1 : 0

  name          = "openthrottle-${var.env_name}-allow-ssh"
  network       = var.network
  project       = var.project_id
  source_ranges = var.ssh_allowed_cidrs
  target_tags   = ["openthrottle-http"]

  allow {
    ports    = ["22"]
    protocol = "tcp"
  }
}

################################################################################
# Secret Manager: the Postgres password.
#
# Previously postgres_password was interpolated straight into
# metadata_startup_script, which is readable by anyone holding
# compute.instances.get on the project — a much wider audience than Terraform
# state. Storing it here and fetching it at boot removes it from metadata.
#
# It remains in Terraform state, and that is unavoidable rather than an
# oversight: Cloud SQL needs the password at instance-create time, so Terraform
# must know it. State is already sensitive and access-controlled; instance
# metadata is not. This closes the gap that could be closed.
#
# Requires the Secret Manager API to be enabled on the project
# (`gcloud services enable secretmanager.googleapis.com`). Deliberately NOT
# managed as a google_project_service resource here, because destroying that
# resource can disable the API for everything else in the project.
################################################################################
resource "google_secret_manager_secret" "postgres_password" {
  count = var.deploy_enabled ? 1 : 0

  project   = var.project_id
  secret_id = "openthrottle-${var.env_name}-postgres-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "postgres_password" {
  count = var.deploy_enabled ? 1 : 0

  secret      = google_secret_manager_secret.postgres_password[0].id
  secret_data = var.postgres_password
}

# The instance fetches the secret with its default compute service account.
resource "google_secret_manager_secret_iam_member" "e2_postgres_password_accessor" {
  count = var.deploy_enabled ? 1 : 0

  member    = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  project   = var.project_id
  role      = "roles/secretmanager.secretAccessor"
  secret_id = google_secret_manager_secret.postgres_password[0].secret_id
}

################################################################################
# Reserved IP range for Memorystore Redis (required; allocated to VPC).
################################################################################
resource "google_compute_global_address" "redis_reserved" {
  address_type  = "INTERNAL"
  name          = "openthrottle-${var.env_name}-redis-reserved"
  network       = var.network
  prefix_length = 29
  project       = var.project_id
  purpose       = "VPC_PEERING"
}

################################################################################
# Allow E2 default service account to pull images from Artifact Registry.
################################################################################
resource "google_project_iam_member" "e2_artifact_registry_reader" {
  count   = var.deploy_enabled ? 1 : 0
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  project = var.project_id
  role    = "roles/artifactregistry.reader"
}

locals {
  caddyfile = templatefile("${path.module}/templates/Caddyfile.tpl", {
    api_domain       = var.api_domain
    developer_domain = var.developer_domain
    mcp_domain       = var.mcp_domain
  })

  compose_content = templatefile("${path.module}/templates/docker-compose.yml.tpl", {
    api_domain       = var.api_domain
    caddy_image      = var.caddy_image
    developer_domain = var.developer_domain
    developer_image  = var.developer_image
    mcp_image        = var.mcp_image
    migrations_image = var.migrations_image
    server_image     = var.server_image
  })

  postgres_host = var.postgres_public_ip_enabled ? module.cloud_sql_postgres.public_ip_address : coalesce(module.cloud_sql_postgres.private_ip_address, module.cloud_sql_postgres.public_ip_address)

  startup_script = var.deploy_enabled ? templatefile("${path.module}/templates/startup.sh.tpl", {
    api_domain               = var.api_domain
    artifact_registry_region = var.artifact_registry_region
    caddyfile_content        = local.caddyfile
    compose_content          = local.compose_content
    developer_domain         = var.developer_domain
    jwt_secret               = var.jwt_secret
    postgres_db              = var.postgres_db_name
    postgres_host            = local.postgres_host

    # The password is NOT interpolated any more. The instance fetches it from
    # Secret Manager at boot, so it never lands in instance metadata.
    postgres_password_secret = var.deploy_enabled ? google_secret_manager_secret.postgres_password[0].secret_id : ""

    postgres_port                    = "5432"
    postgres_ssl_reject_unauthorized = tostring(var.postgres_ssl_reject_unauthorized)
    postgres_user                    = var.postgres_user
    project_id                       = var.project_id
    redis_host                       = module.redis.host
    redis_port                       = tostring(module.redis.port)
    registry_domain                  = "${var.artifact_registry_region}-docker.pkg.dev"
  }) : ""
}

module "cloud_sql_postgres" {
  source = "../../modules/gcp_cloud_sql_postgres"

  authorized_networks = var.postgres_authorized_networks
  disk_size_gb        = var.postgres_disk_size_gb
  disk_type           = var.postgres_disk_type
  name                = "openthrottle-${var.env_name}-postgres"
  project_id          = var.project_id
  public_ip_enabled   = var.postgres_public_ip_enabled
  region              = var.region
  ssl_mode            = var.postgres_ssl_mode
  tier                = var.postgres_tier
}

module "compute_e2" {
  source = "../../modules/gcp_compute_e2"

  disk_size_gb            = var.compute_disk_size_gb
  machine_type            = var.compute_machine_type
  metadata_startup_script = local.startup_script
  name                    = "openthrottle-${var.env_name}-e2"
  network                 = var.network
  network_tags            = var.deploy_enabled ? ["openthrottle-http"] : []
  project_id              = var.project_id
  region                  = var.region
  zone                    = var.zone
}

module "redis" {
  source = "../../modules/gcp_memorystore_redis"

  memory_size_gb    = var.redis_memory_size_gb
  name              = "openthrottle-${var.env_name}-redis"
  project_id        = var.project_id
  region            = var.region
  reserved_ip_range = "${google_compute_global_address.redis_reserved.address}/29"
  tier              = var.redis_tier
}
