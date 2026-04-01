# Service accounts for staging automation (CI / GitHub Actions).
# JSON keys are not managed here; create and rotate keys via gcloud (see repo docs).

resource "google_service_account" "gcs_workflow" {
  account_id   = "staging-gcs-workflow"
  description  = "Least-privilege access to staging GCS buckets for CI workflows (e.g. Nx remote cache)."
  display_name = "Staging GCS workflow (CI)"
  project      = local.project_id
}
