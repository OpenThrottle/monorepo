# OpenThrottle — staging composition via application module.
#
# STATUS: NOT ACTIVE. The module block below is intentionally commented out — the
# OpenThrottle app composition is NOT instantiated in staging (or any live env).
# The deploy module exists (../../applications/openthrottle) but is not wired up.
# Do not assume staging infra is deployed. To activate, uncomment the block,
# supply real domains/network/credentials, then run terraform plan/apply.
#
# # Composes Compute Engine E2, Memorystore Redis, Cloud SQL PostgreSQL in us-west1.
# # See ../../applications/openthrottle for the reusable module; optional overrides in variables.tf there.

# module "openthrottle" {
#   source = "../../applications/openthrottle"

#   api_domain       = "api-staging.openthrottle.ai"
#   developer_domain = "developer-staging.openthrottle.ai"
#   env_name         = local.project_env
#   network          = local.project_network
#   project_id       = local.project_id
#   region           = local.project_region
#   zone             = local.project_zone

#   # Override Postgres-related variables (otherwise module defaults apply)
#   # postgres_db_name  = var.postgres_db_name
#   # postgres_user     = var.postgres_user
#   # postgres_password = var.postgres_password # from env vars or Secret Manager
# }
