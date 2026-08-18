# Memorystore for Redis (aligned to infra/estimates/archive/gcp-estimate-2026-03-04-mysql-superseded.csv).
# Basic tier M1 in us-west1.

resource "google_redis_instance" "redis" {
  display_name      = var.name
  labels            = var.labels
  memory_size_gb    = var.memory_size_gb
  name              = var.name
  project           = var.project_id
  redis_version     = var.redis_version
  region            = var.region
  reserved_ip_range = var.reserved_ip_range
  tier              = var.tier
}
