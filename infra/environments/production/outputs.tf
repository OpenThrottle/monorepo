output "gcs_workflow_service_account_email" {
  description = "Email of the production CI workflow service account (Artifact Registry IAM, CI key identity)."
  value       = google_service_account.gcs_workflow.email
}

# Artifact Registry (OpenThrottle Docker images; see environments/README.md and openthrottle-docker.yml)
output "artifact_registry_docker_host" {
  description = "Docker registry hostname (e.g. us-west2-docker.pkg.dev). Matches ARTIFACT_REGISTRY_REGION in GitHub Actions."
  value       = module.artifact_registry_openthrottle.docker_registry_host
}

output "artifact_registry_repository_id" {
  description = "Repository id (path segment before image name). CI pushes to <host>/<project>/<repository_id>/<image>:<tag>."
  value       = module.artifact_registry_openthrottle.repository_id
}

output "artifact_registry_image_prefix" {
  description = "Full registry prefix for image refs: <host>/<gcp_project>/<repository_id>. Pair with vars.GOOGLE_PROJECT_ID_PRODUCTION in GitHub."
  value       = module.artifact_registry_openthrottle.registry_image_prefix
}
