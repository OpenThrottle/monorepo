# Docker-format Artifact Registry repository for OpenThrottle images.
# Matches CI: <region>-docker.pkg.dev/<project>/openthrottle/<image>:<tag>

resource "google_artifact_registry_repository" "this" {
  description   = var.description
  format        = "DOCKER"
  labels        = var.labels
  location      = var.location
  project       = var.project_id
  repository_id = var.repository_id
}
