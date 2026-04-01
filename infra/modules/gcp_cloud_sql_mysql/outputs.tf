# Outputs for Cloud SQL MySQL module.

output "connection_name" {
  description = "Connection name (project:region:instance) for client connections."
  value       = google_sql_database_instance.mysql.connection_name
}

output "private_ip_address" {
  description = "Private IP address when private_network is set."
  value       = google_sql_database_instance.mysql.private_ip_address
}

output "public_ip_address" {
  description = "Public IP address when public_ip_enabled is true."
  value       = google_sql_database_instance.mysql.public_ip_address
}

output "id" {
  description = "Instance id (unique identifier)."
  value       = google_sql_database_instance.mysql.id
}

output "name" {
  description = "Instance name."
  value       = google_sql_database_instance.mysql.name
}

output "region" {
  description = "Region where the instance is created."
  value       = google_sql_database_instance.mysql.region
}

output "self_link" {
  description = "Instance self_link for references."
  value       = google_sql_database_instance.mysql.self_link
}
