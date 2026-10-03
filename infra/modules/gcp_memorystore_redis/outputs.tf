# Outputs for Memorystore for Redis module.

output "host" {
  description = "Host IP of the Redis instance (connection endpoint)."
  value       = google_redis_instance.redis.host
}

output "port" {
  description = "Port of the Redis instance."
  value       = google_redis_instance.redis.port
}

output "id" {
  description = "Instance id (unique identifier)."
  value       = google_redis_instance.redis.id
}

output "name" {
  description = "Instance name."
  value       = google_redis_instance.redis.name
}

output "region" {
  description = "Region where the instance is created."
  value       = google_redis_instance.redis.region
}

output "reserved_address" {
  description = "Base address of the allocated peering range (no prefix), for environments that need to re-export it."
  value       = google_compute_global_address.reserved.address
}

output "reserved_ip_range" {
  description = "The allocated peering range in CIDR form, as handed to the instance."
  value       = "${google_compute_global_address.reserved.address}/${var.reserved_prefix_length}"
}
