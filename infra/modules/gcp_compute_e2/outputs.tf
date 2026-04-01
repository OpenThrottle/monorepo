# Outputs for Compute Engine E2 + SSD PD module.

output "instance_id" {
  description = "Instance id (self_link unique identifier)."
  value       = google_compute_instance.e2.instance_id
}

output "instance_name" {
  description = "Instance name."
  value       = google_compute_instance.e2.name
}

output "instance_self_link" {
  description = "Instance self_link for references."
  value       = google_compute_instance.e2.self_link
}

output "instance_public_ip" {
  description = "Ephemeral public (NAT) IP of the instance (from access_config)."
  value       = google_compute_instance.e2.network_interface[0].access_config[0].nat_ip
}

output "disk_id" {
  description = "SSD disk id (self_link unique identifier)."
  value       = google_compute_disk.ssd.id
}

output "disk_self_link" {
  description = "SSD disk self_link for references."
  value       = google_compute_disk.ssd.self_link
}

output "zone" {
  description = "Zone where the instance and disk are created."
  value       = local.zone
}
