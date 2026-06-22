# Self-tests for security.rego, executed by `conftest verify`.
#
#   conftest verify --policy infra/tests/policy
#
# Each test feeds a synthetic `input` (matching Conftest's HCL2 shape) and
# asserts the expected deny messages fire (or stay silent) for the fixtures.

package main

import rego.v1

# --- 1. Cloud SQL ssl_mode -------------------------------------------------

test_denies_cleartext_ssl_mode if {
	some msg in deny with input as {"resource": {"google_sql_database_instance": {"pg": {
		"name": "ot-pg",
		"settings": {"ip_configuration": {"ssl_mode": "ALLOW_UNENCRYPTED_AND_ENCRYPTED"}},
	}}}}
	contains(msg, "ALLOW_UNENCRYPTED_AND_ENCRYPTED")
}

test_allows_encrypted_only_ssl_mode if {
	count(deny) == 0 with input as {"resource": {"google_sql_database_instance": {"pg": {
		"name": "ot-pg",
		"settings": {"ip_configuration": {"ssl_mode": "ENCRYPTED_ONLY"}},
	}}}}
}

# --- 2. Cloud SQL open authorized_networks ---------------------------------

test_denies_open_authorized_network if {
	some msg in deny with input as {"resource": {"google_sql_database_instance": {"pg": {
		"name": "ot-pg",
		"settings": {"ip_configuration": {
			"ssl_mode": "ENCRYPTED_ONLY",
			"authorized_networks": [{"name": "world", "value": "0.0.0.0/0"}],
		}},
	}}}}
	contains(msg, "0.0.0.0/0")
}

test_allows_scoped_authorized_network if {
	count(deny) == 0 with input as {"resource": {"google_sql_database_instance": {"pg": {
		"name": "ot-pg",
		"settings": {"ip_configuration": {
			"ssl_mode": "ENCRYPTED_ONLY",
			"authorized_networks": [{"name": "office", "value": "203.0.113.0/24"}],
		}},
	}}}}
}

# --- 3. State bucket versioning --------------------------------------------

test_denies_state_bucket_without_versioning if {
	some msg in deny with input as {"resource": {"google_storage_bucket": {"tfstate": {
		"name": "openthrottle-staging-terraform-state",
		"uniform_bucket_level_access": true,
	}}}}
	contains(msg, "versioning")
}

test_allows_state_bucket_with_versioning if {
	count(deny) == 0 with input as {"resource": {"google_storage_bucket": {"tfstate": {
		"name": "openthrottle-staging-terraform-state",
		"uniform_bucket_level_access": true,
		"versioning": {"enabled": true},
	}}}}
}

# --- 4. Uniform bucket-level access ----------------------------------------

test_denies_bucket_without_uniform_access if {
	some msg in deny with input as {"resource": {"google_storage_bucket": {"cache": {
		"name": "openthrottle-staging-nx-cache",
		"uniform_bucket_level_access": false,
	}}}}
	contains(msg, "uniform_bucket_level_access")
}
