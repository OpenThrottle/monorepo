locals {
  project_env    = "staging"
  project_id     = "monorepo-staging-473406"
  project_region = "us-central1"
  project_zone   = "us-central1-a"

  # OpenThrottle resources (us-west1 per gcp-estimate.csv)
  ot_network = google_compute_network.vpc_network.self_link
  ot_region  = "us-west1"
  ot_zone    = "us-west1-a"
}
