# Google Artifact Registry — Docker repository for OpenThrottle container images.
# Aligns with .github/workflows/openthrottle-docker.yml and scripts/gcs-docker-upload.ts.
#
# CI: GOOGLE_CREDENTIALS_PRODUCTION should use a key for google_service_account.gcs_workflow (same
# pattern as staging — see docs/infra/staging-gcs-workflow-service-account.md). E2 pull is handled
# in infra/applications/openthrottle for the default compute SA.

module "artifact_registry_openthrottle" {
  source = "../../modules/gcp_artifact_registry"

  labels = {
    app = "openthrottle"
    env = local.project_env
  }

  description = "Production: Docker images for OpenThrottle (CI push, E2 pull)."
  location    = "us-west2"
  project_id  = local.project_id

  repository_writer_members = [
    "serviceAccount:${google_service_account.gcs_workflow.email}",
  ]
}
