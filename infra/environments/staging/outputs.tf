output "gcs_workflow_service_account_email" {
  description = "Email of the staging GCS workflow service account (for bucket IAM and CI identity)."
  value       = google_service_account.gcs_workflow.email
}

output "bucket_nx_cache" {
  sensitive = false
  value     = google_storage_bucket.nx_cache.name
}

output "bucket_terraform_state" {
  sensitive = false
  value     = google_storage_bucket.terraform_state.name
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
  description = "Full registry prefix for image refs: <host>/<gcp_project>/<repository_id>. Pair with vars.GOOGLE_PROJECT_ID_STAGING in GitHub."
  value       = module.artifact_registry_openthrottle.registry_image_prefix
}

# # OpenThrottle module outputs (endpoints for app config / docs)
# output "cloud_sql_connection_name" {
#   sensitive = false
#   value     = module.openthrottle.postgres_connection_name
# }

# output "compute_instance_name" {
#   sensitive = false
#   value     = module.openthrottle.compute_instance_name
# }


# output "compute_public_ip" {
#   description = "OpenThrottle E2 instance public IP (for SSH/docs)."
#   value       = module.openthrottle.compute_instance_public_ip
# }

# output "redis_host" {
#   sensitive = false
#   value     = module.openthrottle.redis_host
# }

# output "redis_port" {
#   value = module.openthrottle.redis_port
# }
