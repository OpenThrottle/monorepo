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

# --- 5. hcloud firewall: SSH exposure --------------------------------------

test_denies_hcloud_ssh_open_to_world if {
	some msg in deny with input as {"resource": {"hcloud_firewall": {"fw": {
		"name": "ot-fw",
		"rule": [{"direction": "in", "port": "22", "protocol": "tcp", "source_ips": ["0.0.0.0/0"]}],
	}}}}
	contains(msg, "exposes SSH")
}

test_denies_hcloud_ssh_open_to_world_ipv6 if {
	some msg in deny with input as {"resource": {"hcloud_firewall": {"fw": {
		"name": "ot-fw",
		"rule": [{"direction": "in", "port": "22", "protocol": "tcp", "source_ips": ["::/0"]}],
	}}}}
	contains(msg, "exposes SSH")
}

test_allows_hcloud_ssh_scoped if {
	count(deny) == 0 with input as {"resource": {"hcloud_firewall": {"fw": {
		"name": "ot-fw",
		"rule": [{"direction": "in", "port": "22", "protocol": "tcp", "source_ips": ["203.0.113.4/32"]}],
	}}}}
}

test_allows_hcloud_web_ports_open_to_world if {
	# 80/443 open to the internet is the POINT of a public web endpoint.
	count(deny) == 0 with input as {"resource": {"hcloud_firewall": {"fw": {
		"name": "ot-fw",
		"rule": [
			{"direction": "in", "port": "80", "protocol": "tcp", "source_ips": ["0.0.0.0/0", "::/0"]},
			{"direction": "in", "port": "443", "protocol": "tcp", "source_ips": ["0.0.0.0/0", "::/0"]},
		],
	}}}}
}

# --- 6. hcloud firewall: database ports ------------------------------------

test_denies_hcloud_postgres_port if {
	some msg in deny with input as {"resource": {"hcloud_firewall": {"fw": {
		"name": "ot-fw",
		"rule": [{"direction": "in", "port": "5432", "protocol": "tcp", "source_ips": ["203.0.113.4/32"]}],
	}}}}
	contains(msg, "database port 5432")
}

test_denies_hcloud_redis_port_even_when_scoped if {
	# Scoping does not redeem it: the containers publish no host ports, so a
	# rule here can only be exposing something that should not be published.
	some msg in deny with input as {"resource": {"hcloud_firewall": {"fw": {
		"name": "ot-fw",
		"rule": [{"direction": "in", "port": "6379", "protocol": "tcp", "source_ips": ["10.0.0.0/8"]}],
	}}}}
	contains(msg, "database port 6379")
}

# --- 7. hcloud server: backups ---------------------------------------------

test_denies_hcloud_server_without_backups if {
	some msg in deny with input as {"resource": {"hcloud_server": {"box": {
		"name": "ot-production",
		"backups": false,
	}}}}
	contains(msg, "backups = false")
}

test_allows_hcloud_server_with_backups if {
	count(deny) == 0 with input as {"resource": {"hcloud_server": {"box": {
		"name": "ot-production",
		"backups": true,
	}}}}
}

test_allows_hcloud_server_backups_unset if {
	# Unset means the module default (true) applies; only an explicit false is a
	# deliberate opt-out worth failing on.
	count(deny) == 0 with input as {"resource": {"hcloud_server": {"box": {"name": "ot-production"}}}}
}
