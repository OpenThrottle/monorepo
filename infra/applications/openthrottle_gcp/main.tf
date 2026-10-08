################################################################################
#
# OpenThrottle application module — main.
# Composes Cloud SQL Postgres, Compute E2 and Memorystore Redis. Each child
# module owns the resources that share its lifecycle: the Redis peering range
# belongs to the Redis module and the firewall rules to the compute module, so
# what is left here is genuinely cross-cutting — the Postgres secret, the
# Artifact Registry grant, and the rendered startup script.
#
# Module sources are relative to this application (../../modules from applications/openthrottle_gcp).
#
################################################################################

data "google_project" "project" {
  project_id = var.project_id
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
# The two firewall rules used to be declared here, targeting a hardcoded
# "openthrottle-http" tag that this module then applied to the instance. They
# now live in the compute module, for the same reason the peering range moved
# into the Redis module: a rule that targets exactly one instance shares that
# instance's lifecycle.
#
# The rules are RENAMED as a result — they are now named from the instance
# (openthrottle-{env}-e2-allow-http-https) rather than from the environment, and
# the tag they target is derived the same way instead of being a constant shared
# by every environment. Nothing has been applied anywhere, so this costs nothing
# today; the moved blocks keep it a rename rather than an unexplained
# destroy/create for anyone who applied out of band.
################################################################################
# Indexed on the destination side only: the rule was unconditional here and is
# counted in the module, which is exactly Terraform's "resource gained a count"
# move. When firewall_enabled is false there is no [0] to move into and the rule
# is destroyed — which is the intended behaviour change, not an accident.
moved {
  from = google_compute_firewall.allow_http_https
  to   = module.compute_e2.google_compute_firewall.allow_http_https[0]
}

moved {
  from = google_compute_firewall.allow_ssh
  to   = module.compute_e2.google_compute_firewall.allow_ssh
}

################################################################################
# The Redis peering range used to be declared here and passed back down as
# reserved_ip_range. It now lives inside the module that needs it, which is why
# this composition no longer mentions a /29 at all.
#
# The resource NAME is unchanged (the module builds "<name>-reserved" from the
# same prefix this module already passed), so this is an address move in state,
# not a replacement.
################################################################################
moved {
  from = google_compute_global_address.redis_reserved
  to   = module.redis.google_compute_global_address.reserved
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
  project_id              = var.project_id
  region                  = var.region
  zone                    = var.zone

  # Mirrors the Hetzner path, where firewall_enabled is likewise tied to
  # deploy_enabled: there is nothing to reach until something is deployed.
  firewall_enabled  = var.deploy_enabled
  ssh_allowed_cidrs = var.ssh_allowed_cidrs
}

module "redis" {
  source = "../../modules/gcp_memorystore_redis"

  memory_size_gb = var.redis_memory_size_gb
  name           = "openthrottle-${var.env_name}-redis"
  network        = var.network
  project_id     = var.project_id
  region         = var.region
  tier           = var.redis_tier
}
