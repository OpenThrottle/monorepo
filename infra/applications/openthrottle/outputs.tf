# OpenThrottle application module — outputs.
# Re-exports from child modules for use by environments or other modules.

output "compute_instance_name" {
  description = "Compute Engine E2 instance name."
  value       = module.openthrottle_compute_e2.instance_name
}

output "compute_instance_self_link" {
  description = "Compute Engine E2 instance self_link."
  value       = module.openthrottle_compute_e2.instance_self_link
}

output "compute_instance_public_ip" {
  description = "Compute Engine E2 instance ephemeral public (NAT) IP."
  value       = module.openthrottle_compute_e2.instance_public_ip
}

output "postgres_connection_name" {
  description = "Cloud SQL PostgreSQL connection name (project:region:instance)."
  value       = module.openthrottle_cloud_sql_postgres.connection_name
}

output "postgres_public_ip_address" {
  description = "Cloud SQL PostgreSQL public IP when public_ip_enabled is true."
  value       = module.openthrottle_cloud_sql_postgres.public_ip_address
}

output "redis_host" {
  description = "Memorystore Redis host (connection endpoint)."
  value       = module.openthrottle_redis.host
}

output "redis_port" {
  description = "Memorystore Redis port."
  value       = module.openthrottle_redis.port
}

output "redis_reserved_address" {
  description = "Reserved IP address used for Redis VPC peering (CIDR base)."
  value       = google_compute_global_address.openthrottle_redis_reserved.address
}
