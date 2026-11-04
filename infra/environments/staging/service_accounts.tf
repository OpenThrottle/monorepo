# Service accounts for staging automation (CI / GitHub Actions).
# JSON keys are NOT managed here: google_service_account_key would put private key
# material in Terraform state. Issue and rotate them out of band with
# `gcloud iam service-accounts keys create` (and `keys delete` for the old one),
# then paste the whole JSON into the GitHub repository secret named below. The
# account email is available as the `gcs_workflow_service_account_email` output.
#
# Secret: GOOGLE_CREDENTIALS_STAGING, read by .github/workflows/openthrottle-docker.yml.

resource "google_service_account" "gcs_workflow" {
  account_id   = "staging-gcs-workflow"
  description  = "Least-privilege access to staging GCS buckets for CI workflows (e.g. Nx remote cache)."
  display_name = "Staging GCS workflow (CI)"
  project      = local.project_id
}
