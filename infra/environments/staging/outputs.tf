output "bucket_nx_cache" {
  sensitive = false
  value     = google_storage_bucket.nx_cache.name
}

output "bucket_terraform_state" {
  sensitive = false
  value     = google_storage_bucket.terraform_state.name
}

# # OpenThrottle module outputs (endpoints for app config / docs)
# output "cloud_sql_connection_name" {
#   sensitive = false
#   value     = module.openthrottle.postgres_connection_name
# }

# output "compute_instance_name" {
#   sensitive = false
#   value     = module.openthrottle.compute_instance_name
# }


# output "compute_public_ip" {
#   description = "OpenThrottle E2 instance public IP (for SSH/docs)."
#   value       = module.openthrottle.compute_instance_public_ip
# }

# output "redis_host" {
#   sensitive = false
#   value     = module.openthrottle.redis_host
# }

# output "redis_port" {
#   value = module.openthrottle.redis_port
# }
