# Conftest/OPA security policies for OpenThrottle Terraform.
#
# These encode the issues surfaced in the infra audit so they fail CI if a
# regression reintroduces them:
#
#   1. Cloud SQL must enforce encrypted connections (no cleartext SSL mode).
#   2. Cloud SQL must not be openly reachable (no public IP with 0.0.0.0/0).
#   3. The Terraform state bucket must have object versioning enabled.
#   4. Storage buckets must enforce uniform bucket-level access.
#
# Conftest parses `.tf` files via the HCL2 parser into:
#   input.resource.<resource_type>.<resource_name> = { ...body... }
#
# Run against a Terraform root:
#   conftest test --policy infra/tests/policy infra/environments/staging
#
# Self-test the policies against the fixtures:
#   conftest verify --policy infra/tests/policy

package main

import rego.v1

# --- helpers ---------------------------------------------------------------

# Resource bodies for a given type, regardless of HCL nesting shape.
# Conftest may represent a resource block as an object (single instance) or as
# an array of objects (multiple instances); normalize both to a set of bodies.
resource_bodies(resource_type) := bodies if {
	blocks := object.get(input, ["resource", resource_type], {})
	bodies := {body |
		some name
		raw := blocks[name]
		body := normalize(raw)[_]
	}
}

# An instance may be an object or a single-element array; always yield bodies.
normalize(raw) := [raw] if {
	is_object(raw)
}

normalize(raw) := raw if {
	is_array(raw)
}

# settings/ip_configuration blocks can be objects or arrays; flatten to objects.
sub_blocks(body, key) := result if {
	raw := object.get(body, [key], [])
	is_array(raw)
	result := raw
}

sub_blocks(body, key) := [raw] if {
	raw := object.get(body, [key], {})
	is_object(raw)
	count(raw) > 0
}

# --- 1. Cloud SQL: encrypted connections only ------------------------------

deny contains msg if {
	some body in resource_bodies("google_sql_database_instance")
	some settings in sub_blocks(body, "settings")
	some ipcfg in sub_blocks(settings, "ip_configuration")
	ipcfg.ssl_mode == "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
	msg := "google_sql_database_instance: ssl_mode ALLOW_UNENCRYPTED_AND_ENCRYPTED permits cleartext connections; use ENCRYPTED_ONLY or TRUSTED_CLIENT_CERTIFICATE_REQUIRED."
}

# --- 2. Cloud SQL: no open public exposure ---------------------------------

deny contains msg if {
	some body in resource_bodies("google_sql_database_instance")
	some settings in sub_blocks(body, "settings")
	some ipcfg in sub_blocks(settings, "ip_configuration")
	some authnet in sub_blocks(ipcfg, "authorized_networks")
	authnet.value == "0.0.0.0/0"
	msg := "google_sql_database_instance: authorized_networks must not include 0.0.0.0/0 (open to the internet)."
}

# --- 3. Terraform state bucket: versioning enabled -------------------------

deny contains msg if {
	some name
	bucket := input.resource.google_storage_bucket[name]
	body := normalize(bucket)[_]
	is_state_bucket(body)
	not versioning_enabled(body)
	msg := sprintf("google_storage_bucket %q is a Terraform state bucket and must enable object versioning to protect state history.", [name])
}

is_state_bucket(body) if {
	contains(object.get(body, ["name"], ""), "terraform-state")
}

versioning_enabled(body) if {
	some versioning in sub_blocks(body, "versioning")
	versioning.enabled == true
}

# --- 4. Storage buckets: uniform bucket-level access -----------------------

deny contains msg if {
	some name
	bucket := input.resource.google_storage_bucket[name]
	body := normalize(bucket)[_]
	object.get(body, ["uniform_bucket_level_access"], false) != true
	msg := sprintf("google_storage_bucket %q must set uniform_bucket_level_access = true.", [name])
}
