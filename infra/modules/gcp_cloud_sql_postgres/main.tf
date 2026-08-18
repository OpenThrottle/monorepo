# Cloud SQL for PostgreSQL (OpenThrottle; aligned to infra/estimates/archive/gcp-estimate-2026-03-04-mysql-superseded.csv).
# Zonal Micro instance with low-cost storage in us-west1.

resource "google_sql_database_instance" "postgres" {
  database_version = var.database_version
  name             = var.name
  project          = var.project_id
  region           = var.region

  settings {
    availability_type = "ZONAL"
    disk_size         = var.disk_size_gb
    disk_type         = var.disk_type
    tier              = var.tier

    backup_configuration {
      enabled                        = var.backup_enabled
      start_time                     = var.backup_start_time
      point_in_time_recovery_enabled = false
    }

    ip_configuration {
      ipv4_enabled    = var.public_ip_enabled
      private_network = var.private_network
      ssl_mode        = var.ssl_mode

      dynamic "authorized_networks" {
        for_each = var.authorized_networks

        content {
          name  = authorized_networks.value.name
          value = authorized_networks.value.value
        }
      }
    }

    dynamic "database_flags" {
      for_each = var.database_flags

      content {
        name  = database_flags.value.name
        value = database_flags.value.value
      }
    }
  }

  deletion_protection = var.deletion_protection
}
