# OpenThrottle — staging composition via application module.
# Composes Compute Engine E2, Memorystore Redis, Cloud SQL PostgreSQL in us-west1.
# See ../../applications/openthrottle for the reusable module; optional overrides in variables.tf there.

module "openthrottle" {
  source = "../../applications/openthrottle"

  api_domain       = "api-staging.openthrottle.ai"
  developer_domain = "developer-staging.openthrottle.ai"
  env_name         = local.project_env
  network          = local.ot_network
  project_id       = local.project_id
  region           = local.ot_region
  zone             = local.ot_zone

  # Override Postgres-related variables (otherwise module defaults apply)
  # postgres_db_name  = var.postgres_db_name
  # postgres_user     = var.postgres_user
  # postgres_password = var.postgres_password # from env vars or Secret Manager
}
