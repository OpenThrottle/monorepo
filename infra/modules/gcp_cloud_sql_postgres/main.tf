# Cloud SQL for PostgreSQL (OpenThrottle; aligned to gcp-estimate.csv).
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
