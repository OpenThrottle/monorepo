# Google Artifact Registry — Docker repository for OpenThrottle container images.
# Aligns with .github/workflows/openthrottle-docker.yml and scripts/gcs-docker-upload.sh.
#
# CI: GOOGLE_CREDENTIALS_STAGING (JSON key for google_service_account.gcs_workflow) must match a
# member here or pushes will fail permission denied. E2 image pull is roles/artifactregistry.reader
# on the project in infra/applications/openthrottle (default compute SA).

module "artifact_registry_openthrottle" {
  source = "../../modules/gcp_artifact_registry"

  description = "Staging: Docker images for OpenThrottle (CI push, E2 pull)."
  location    = "us-west2"
  project_id  = local.project_id

  labels = {
    app = "openthrottle"
    env = local.project_env
  }

  repository_writer_members = [
    "serviceAccount:${google_service_account.gcs_workflow.email}",
  ]
}
