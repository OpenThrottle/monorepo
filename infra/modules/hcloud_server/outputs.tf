# Outputs for the hcloud_server module.

output "server_id" {
  description = "Hetzner server id."
  value       = hcloud_server.this.id
}

output "server_name" {
  description = "Server name."
  value       = hcloud_server.this.name
}

output "ipv4_address" {
  description = "Public IPv4 address, or an empty string when ipv4_enabled is false. This is the A record target for api_domain and developer_domain."
  value       = var.ipv4_enabled ? hcloud_server.this.ipv4_address : ""
}

output "ipv6_address" {
  description = "Public IPv6 address, or an empty string when ipv6_enabled is false. The AAAA record target."
  value       = var.ipv6_enabled ? hcloud_server.this.ipv6_address : ""
}

output "firewall_id" {
  description = "Attached firewall id, or null when firewall_enabled is false."
  value       = var.firewall_enabled ? hcloud_firewall.this[0].id : null
}

output "data_volume_id" {
  description = "Attached data volume id, or null when data_volume_size_gb is 0."
  value       = var.data_volume_size_gb > 0 ? hcloud_volume.data[0].id : null
}

output "data_volume_device" {
  description = "Stable device path of the attached data volume (/dev/disk/by-id/...), or an empty string when disabled. Cloud-init must mount THIS rather than a kernel device name like /dev/sdb, which is not stable across reboots."
  value       = var.data_volume_size_gb > 0 ? hcloud_volume.data[0].linux_device : ""
}
