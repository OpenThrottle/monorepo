# Memorystore for Redis (aligned to gcp-estimate.csv).
# Basic tier M1 in us-west1.
#
# The instance and the VPC range it peers into are ONE unit: the range exists
# for this instance, is named from it, and is useless without it. Owning both
# here is what lets a caller ask for "Redis on this network" instead of
# allocating a /29 by hand and remembering to pass it back in — which is how
# the range and the instance drift apart.
#
# The Hetzner path has no equivalent: there Redis is a container on the box
# (see applications/openthrottle_hcloud), so there is no network to peer into.

################################################################################
# Reserved IP range for the instance.
#
# prefix_length 29 is the smallest range Memorystore accepts and is sized for
# one BASIC instance. The range must not overlap anything else in the VPC.
################################################################################
resource "google_compute_global_address" "reserved" {
  address_type  = "INTERNAL"
  name          = "${var.name}-reserved"
  network       = var.network
  prefix_length = var.reserved_prefix_length
  project       = var.project_id
  purpose       = "VPC_PEERING"
}

resource "google_redis_instance" "redis" {
  display_name      = var.name
  labels            = var.labels
  memory_size_gb    = var.memory_size_gb
  name              = var.name
  project           = var.project_id
  redis_version     = var.redis_version
  region            = var.region
  reserved_ip_range = "${google_compute_global_address.reserved.address}/${var.reserved_prefix_length}"
  tier              = var.tier
}
