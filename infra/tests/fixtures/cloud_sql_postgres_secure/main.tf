# Module example fixture: a secure Cloud SQL Postgres usage.
#
# Doubles as (a) a `terraform validate` smoke target for the
# gcp_cloud_sql_postgres module and (b) a Conftest fixture that MUST PASS the
# security policies in infra/tests/policy.
#
#   terraform -chdir=infra/tests/fixtures/cloud_sql_postgres_secure init -backend=false
#   terraform -chdir=infra/tests/fixtures/cloud_sql_postgres_secure validate
#   conftest test --policy infra/tests/policy infra/tests/fixtures/cloud_sql_postgres_secure

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "7.4.0"
    }
  }
}

module "postgres" {
  source = "../../../modules/gcp_cloud_sql_postgres"

  name       = "ot-fixture-pg"
  project_id = "openthrottle-fixture"
  region     = "us-west1"

  # Secure-by-default: encrypted connections, no public exposure.
  public_ip_enabled = false
  ssl_mode          = "ENCRYPTED_ONLY"
}
