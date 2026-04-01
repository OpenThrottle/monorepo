# OpenThrottle module outputs (endpoints for app config / docs)
output "openthrottle_cloud_sql_connection_name" {
  sensitive = false
  value     = module.openthrottle.postgres_connection_name
}

output "openthrottle_compute_instance_name" {
  sensitive = false
  value     = module.openthrottle.compute_instance_name
}


output "openthrottle_compute_public_ip" {
  description = "OpenThrottle E2 instance public IP (for SSH/docs)."
  value       = module.openthrottle.compute_instance_public_ip
}

output "openthrottle_redis_host" {
  sensitive = false
  value     = module.openthrottle.redis_host
}

output "openthrottle_redis_port" {
  value = module.openthrottle.redis_port
}
