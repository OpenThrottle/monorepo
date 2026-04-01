output "docker_registry_host" {
  description = "Docker registry hostname (e.g. us-west2-docker.pkg.dev)."
  value       = "${var.location}-docker.pkg.dev"
}

output "location" {
  description = "Artifact Registry location (region)."
  value       = google_artifact_registry_repository.this.location
}

output "repository_id" {
  description = "Repository id (path segment before image name)."
  value       = google_artifact_registry_repository.this.repository_id
}

output "repository_name" {
  description = "Full resource name from GCP (projects/.../locations/.../repositories/...)."
  value       = google_artifact_registry_repository.this.name
}

output "registry_image_prefix" {
  description = "Prefix for image references: <host>/<project>/<repository_id> (no trailing slash)."
  value       = "${var.location}-docker.pkg.dev/${var.project_id}/${var.repository_id}"
}
