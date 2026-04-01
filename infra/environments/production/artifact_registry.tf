# Google Artifact Registry — Docker repository for OpenThrottle container images.
# Aligns with .github/workflows/openthrottle-docker.yml and scripts/gcs-docker-upload.sh.

module "artifact_registry_openthrottle" {
  source = "../../modules/gcp_artifact_registry"

  labels = {
    app = "openthrottle"
    env = local.project_env
  }

  location    = "us-west2"
  project_id  = local.project_id
  description = "Production: Docker images for OpenThrottle (CI push, E2 pull)."
}
