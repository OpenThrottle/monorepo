# Outputs for the OpenThrottle Hetzner application module.

output "server_id" {
  description = "Hetzner server id."
  value       = module.server.server_id
}

output "server_name" {
  description = "Hetzner server name."
  value       = module.server.server_name
}

output "ipv4_address" {
  description = "Public IPv4 of the box. This is the A record target for BOTH api_domain and developer_domain (Caddy routes by hostname), and it must be reachable on port 80 before Caddy can complete the ACME HTTP-01 challenge."
  value       = module.server.ipv4_address
}

output "ipv6_address" {
  description = "Public IPv6 of the box — the AAAA record target for the same hostnames."
  value       = module.server.ipv6_address
}

output "api_url" {
  description = "Public HTTPS URL of the API, once DNS points at ipv4_address."
  value       = "https://${var.api_domain}"
}

output "developer_url" {
  description = "Public HTTPS URL of the developer app."
  value       = "https://${var.developer_domain}"
}

output "postgres_host" {
  description = "Host the server uses for Postgres. Echoes the postgres_host variable so an environment can assert which side of ladder rung 2 it is on without reading into the module."
  value       = var.postgres_host
}

output "data_volume_device" {
  description = "Stable /dev/disk/by-id path of the Postgres data volume, or an empty string when data_volume_size_gb is 0. Consumed by cloud-init to mount the volume; never mount a kernel device name."
  value       = module.server.data_volume_device
}

output "firewall_id" {
  description = "Attached firewall id, or null when deploy_enabled is false."
  value       = module.server.firewall_id
}
