# The values you need for the DNS cutover.
#
# Point BOTH hostnames at the same address: Caddy routes by hostname, so one
# server serves both. See applications/openthrottle_hcloud/CUTOVER.md.

output "ipv4_address" {
  description = "A record target for api_domain and developer_domain. Must be reachable on port 80 before Caddy can obtain a certificate."
  value       = module.openthrottle.ipv4_address
}

output "ipv6_address" {
  description = "AAAA record target for the same hostnames."
  value       = module.openthrottle.ipv6_address
}

output "api_url" {
  description = "Public API URL once DNS resolves and Caddy has issued a certificate."
  value       = module.openthrottle.api_url
}

output "developer_url" {
  description = "Public developer-app URL."
  value       = module.openthrottle.developer_url
}

output "data_volume_device" {
  description = "Stable /dev/disk/by-id path cloud-init mounts for the Postgres data directory, or empty when data_volume_size_gb is 0."
  value       = module.openthrottle.data_volume_device
}
