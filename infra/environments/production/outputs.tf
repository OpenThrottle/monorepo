output "gcs_workflow_service_account_email" {
  description = "Email of the production CI workflow service account (Artifact Registry IAM, CI key identity)."
  value       = google_service_account.gcs_workflow.email
}
