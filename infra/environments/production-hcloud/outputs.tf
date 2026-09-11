# Outputs are commented out alongside the module block above; uncomment both
# together. Left in place so activating the environment does not require
# rediscovering which values the cutover runbook needs.

# output "ipv4_address" {
#   description = "A record target for both hostnames (Caddy routes by hostname)."
#   value       = module.openthrottle.ipv4_address
# }

# output "ipv6_address" {
#   description = "AAAA record target."
#   value       = module.openthrottle.ipv6_address
# }

# output "data_volume_device" {
#   description = "Stable /dev/disk/by-id path cloud-init mounts for Postgres data."
#   value       = module.openthrottle.data_volume_device
# }
