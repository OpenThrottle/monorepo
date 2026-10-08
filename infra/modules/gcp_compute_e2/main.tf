# Compute Engine E2 instance with SSD-backed persistent disk (aligned to gcp-estimate.csv).
# E2 Instance + SSD PD in us-west1.
#
# The Hetzner counterpart of this module is hcloud_server, and the two now have
# the same shape: an instance, the storage attached to it, and the firewall that
# scopes what can reach it. A firewall rule and the instance it targets are one
# unit — the rule is named from the instance, targets a tag only this instance
# carries, and protects nothing once the instance is gone.
#
# The structural difference that remains is the one that cannot be designed
# away: a GCP firewall is a rule ON THE NETWORK selected by tag, whereas a
# Hetzner firewall is attached to the server. Hence `network` here and a tag
# round-trip through google_compute_instance.tags, where hcloud_server just
# lists firewall_ids.

locals {
  zone = var.zone != "" ? var.zone : "${var.region}-a"

  # The tag the firewall rules target. Derived from the instance name so it
  # cannot collide with another instance's rules in the same VPC, and so a rule
  # can never outlive its instance while still matching some unrelated VM that
  # happens to carry a shared tag.
  firewall_tag = "${var.name}-http"

  instance_tags = concat(var.firewall_enabled ? [local.firewall_tag] : [], var.network_tags)
}

resource "google_compute_disk" "ssd" {
  name = "${var.name}-ssd"
  type = "pd-ssd"
  size = var.disk_size_gb
  zone = local.zone

  project = var.project_id
  labels  = var.labels
}

################################################################################
# Firewall: HTTP/HTTPS.
#
# Intent: this is a PUBLIC web endpoint. Caddy on the instance terminates TLS
# and reverse-proxies the server/developer apps by hostname, so opening tcp
# 80/443 to the internet is by design — and port 80 specifically must be open
# or Caddy cannot answer the ACME HTTP-01 challenge and certificate issuance
# fails silently.
#
# The rule is scoped two ways: it targets only this instance's tag rather than
# every VM on the network, and it opens only 80 and 443. SSH is a separate,
# opt-in rule below.
#
# What is deliberately NOT opened: 5432 (Postgres) and 6379 (Redis). On this
# path both are managed services off the instance, so there is nothing to
# expose here — but the same prohibition holds as on the Hetzner path, and for
# the same reason. Do not add them.
#
# No rate-limit / WAF layer is applied. If the public surface needs DDoS/WAF
# protection or origin lockdown, front it with Cloudflare or Cloud Armor and
# narrow http_source_ranges to the CDN/proxy egress ranges.
################################################################################
resource "google_compute_firewall" "allow_http_https" {
  count = var.firewall_enabled ? 1 : 0

  name          = "${var.name}-allow-http-https"
  network       = var.network
  project       = var.project_id
  source_ranges = var.http_source_ranges
  target_tags   = [local.firewall_tag]

  allow {
    ports    = ["80", "443"]
    protocol = "tcp"
  }
}

################################################################################
# Firewall: scoped SSH (opt-in).
#
# An empty ssh_allowed_cidrs creates NO rule, which on GCP means the VPC's own
# default rules decide whether 22 is reachable. That is the historical
# behaviour of this module and is only safe if those defaults are known-good —
# it is not the same thing as the Hetzner module's empty list, which under
# default-deny genuinely means no SSH at all. Prefer setting this, or use IAP.
#
# 0.0.0.0/0 is rejected by the variable's validation, so this rule cannot be
# the thing that exposes SSH to the internet.
################################################################################
resource "google_compute_firewall" "allow_ssh" {
  count = var.firewall_enabled && length(var.ssh_allowed_cidrs) > 0 ? 1 : 0

  name          = "${var.name}-allow-ssh"
  network       = var.network
  project       = var.project_id
  source_ranges = var.ssh_allowed_cidrs
  target_tags   = [local.firewall_tag]

  allow {
    ports    = ["22"]
    protocol = "tcp"
  }
}

resource "google_compute_instance" "e2" {
  name         = var.name
  machine_type = var.machine_type
  zone         = local.zone

  project = var.project_id
  labels  = var.labels

  boot_disk {
    initialize_params {
      image = var.boot_image
    }
  }

  attached_disk {
    source      = google_compute_disk.ssd.id
    device_name = "data-ssd"
  }

  network_interface {
    network = var.network
    access_config {}
  }

  metadata_startup_script = var.metadata_startup_script

  tags = local.instance_tags

  allow_stopping_for_update = true
}
