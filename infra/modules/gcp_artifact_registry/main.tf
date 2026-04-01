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

# Least-privilege push: writer on this repository only (not whole project).
# GCE / E2 pull uses roles/artifactregistry.reader on the project in infra/applications/openthrottle.
resource "google_artifact_registry_repository_iam_member" "writers" {
  for_each = toset(var.repository_writer_members)

  location   = google_artifact_registry_repository.this.location
  member     = each.value
  project    = var.project_id
  repository = google_artifact_registry_repository.this.repository_id
  role       = "roles/artifactregistry.writer"
}
