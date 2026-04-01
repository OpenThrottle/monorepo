# OpenThrottle application module — main.
# Composes reserved IP for Redis, Cloud SQL Postgres, Compute E2, Memorystore Redis.
# Module sources are relative to this application (../../modules from applications/openthrottle).

data "google_project" "project" {
  project_id = var.project_id
}

# Reserved IP range for Memorystore Redis (required; allocated to VPC).
resource "google_compute_global_address" "openthrottle_redis_reserved" {
  address_type  = "INTERNAL"
  name          = "openthrottle-${var.env_name}-redis-reserved"
  network       = var.network
  prefix_length = 29
  project       = var.project_id
  purpose       = "VPC_PEERING"
}

module "openthrottle_cloud_sql_postgres" {
  source = "../../modules/gcp_cloud_sql_postgres"

  disk_size_gb      = var.postgres_disk_size_gb
  disk_type         = var.postgres_disk_type
  name              = "openthrottle-${var.env_name}-postgres"
  project_id        = var.project_id
  public_ip_enabled = var.postgres_public_ip_enabled
  region            = var.region
  tier              = var.postgres_tier
}

# Firewall: allow HTTP/HTTPS to the E2 instance (for Caddy reverse proxy).
resource "google_compute_firewall" "openthrottle_allow_http_https" {
  name          = "openthrottle-${var.env_name}-allow-http-https"
  network       = var.network
  project       = var.project_id
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["openthrottle-http"]

  allow {
    ports    = ["80", "443"]
    protocol = "tcp"
  }
}

# Allow E2 default service account to pull images from Artifact Registry.
resource "google_project_iam_member" "openthrottle_e2_artifact_registry_reader" {
  count   = var.deploy_enabled ? 1 : 0
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  project = var.project_id
  role    = "roles/artifactregistry.reader"
}

locals {
  openthrottle_caddyfile = templatefile("${path.module}/templates/Caddyfile.tpl", {
    api_domain       = var.api_domain
    developer_domain = var.developer_domain
  })

  openthrottle_compose_content = templatefile("${path.module}/templates/docker-compose.yml.tpl", {
    api_domain       = var.api_domain
    caddy_image      = var.caddy_image
    developer_domain = var.developer_domain
    developer_image  = var.developer_image
    server_image     = var.server_image
  })

  openthrottle_postgres_host = var.postgres_public_ip_enabled ? module.openthrottle_cloud_sql_postgres.public_ip_address : coalesce(module.openthrottle_cloud_sql_postgres.private_ip_address, module.openthrottle_cloud_sql_postgres.public_ip_address)

  openthrottle_startup_script = var.deploy_enabled ? templatefile("${path.module}/templates/startup.sh.tpl", {
    api_domain               = var.api_domain
    artifact_registry_region = var.artifact_registry_region
    caddyfile_content        = local.openthrottle_caddyfile
    compose_content          = local.openthrottle_compose_content
    developer_domain         = var.developer_domain
    postgres_db              = var.postgres_db_name
    postgres_host            = local.openthrottle_postgres_host
    postgres_password        = var.postgres_password
    postgres_port            = "5432"
    postgres_user            = var.postgres_user
    project_id               = var.project_id
    redis_host               = module.openthrottle_redis.host
    redis_port               = tostring(module.openthrottle_redis.port)
    registry_domain          = "${var.artifact_registry_region}-docker.pkg.dev"
  }) : ""
}

module "openthrottle_compute_e2" {
  source = "../../modules/gcp_compute_e2"

  disk_size_gb            = var.compute_disk_size_gb
  machine_type            = var.compute_machine_type
  metadata_startup_script = local.openthrottle_startup_script
  name                    = "openthrottle-${var.env_name}-e2"
  network                 = var.network
  network_tags            = var.deploy_enabled ? ["openthrottle-http"] : []
  project_id              = var.project_id
  region                  = var.region
  zone                    = var.zone
}

module "openthrottle_redis" {
  source = "../../modules/gcp_memorystore_redis"

  memory_size_gb    = var.redis_memory_size_gb
  name              = "openthrottle-${var.env_name}-redis"
  project_id        = var.project_id
  region            = var.region
  reserved_ip_range = "${google_compute_global_address.openthrottle_redis_reserved.address}/29"
  tier              = var.redis_tier
}
