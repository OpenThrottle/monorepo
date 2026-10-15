# The values the cutover runbook and the deploy workflow need, so activating the
# environment does not require rediscovering them.

output "data_volume_device" {
  description = "Stable /dev/disk/by-id path cloud-init mounts for Postgres data."
  value       = module.openthrottle.data_volume_device
}

output "deploy_firewall_name" {
  description = "Set as the HETZNER_DEPLOY_FIREWALL repository variable."
  value       = module.openthrottle.deploy_firewall_name
}

output "ipv4_address" {
  description = "A record target for both hostnames (Caddy routes by hostname), and HETZNER_DEPLOY_HOST."
  value       = module.openthrottle.ipv4_address
}

output "ipv6_address" {
  description = "AAAA record target."
  value       = module.openthrottle.ipv6_address
}
