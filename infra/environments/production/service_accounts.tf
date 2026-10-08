# Service accounts for production automation (CI / GitHub Actions).
# JSON keys are not managed here; create and rotate keys via gcloud — see
# environments/staging/service_accounts.tf (same pattern; production project + secret).
# Secret: GOOGLE_CREDENTIALS_PRODUCTION, read by .github/workflows/openthrottle-docker.yml.

resource "google_service_account" "gcs_workflow" {
  account_id   = "production-gcs-workflow"
  description  = "Least-privilege access for CI workflows (Artifact Registry push, GCS cache when used, etc.)."
  display_name = "Production GCS / CI workflow"
  project      = local.project_id
}
