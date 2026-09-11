# Hetzner Cloud server for the OpenThrottle single-box stack.
#
# The GCP counterpart of this module is gcp_compute_e2. Two structural
# differences drive everything below:
#
#   1. Hetzner has no VPC with default firewall rules. A GCP instance inherits
#      the network's defaults (which is how gcp_compute_e2 gets away with
#      defining no SSH rule at all — see its comment in
#      applications/openthrottle/main.tf). Here, an attached firewall is
#      default-deny inbound and an unattached one means everything is open.
#      Both the web ports and SSH must therefore be explicit.
#   2. Postgres and Redis run ON this box rather than as managed services, so
#      the data directory's durability is this module's problem. That is what
#      the optional block volume is for.
#
# See infra/hetzner-topology.md for sizing and the scaling ladder, and
# infra/provider-contract.md for how this maps onto the GCP path.

locals {
  # Hetzner requires firewall rule ports as strings, and rejects a port for
  # protocols that have none.
  web_ports = ["80", "443"]

  data_volume_enabled = var.data_volume_size_gb > 0
}

################################################################################
# Firewall
#
# Intent: this is a PUBLIC web endpoint. Caddy on the server terminates TLS and
# reverse-proxies the server/developer apps by hostname, so opening 80/443 to
# the internet is by design.
#
# What is deliberately NOT opened: 5432 (Postgres) and 6379 (Redis). Those
# services run as containers that do not publish host ports, so they are
# unreachable from outside regardless — but the firewall is the second line of
# defence, because a stray `ports:` entry in the compose template would
# otherwise silently expose a database to the internet. Do not add them.
#
# Hetzner firewalls are stateful for inbound and permit all outbound traffic
# unless outbound rules are specified, so no egress rules are needed for
# `docker pull`, ACME, or Postgres replication.
################################################################################
resource "hcloud_firewall" "this" {
  count = var.firewall_enabled ? 1 : 0

  labels = var.labels
  name   = "${var.name}-firewall"

  dynamic "rule" {
    for_each = local.web_ports
    content {
      direction  = "in"
      port       = rule.value
      protocol   = "tcp"
      source_ips = var.http_source_ips
    }
  }

  # SSH only when explicitly scoped. An empty ssh_allowed_cidrs produces no rule
  # at all, which — given default-deny — means no SSH ingress. That is a valid
  # choice for an immutable box; recovery is then via the Hetzner web console.
  dynamic "rule" {
    for_each = length(var.ssh_allowed_cidrs) > 0 ? [1] : []
    content {
      direction  = "in"
      port       = "22"
      protocol   = "tcp"
      source_ips = var.ssh_allowed_cidrs
    }
  }

  # ICMP echo, scoped to the same ranges allowed to SSH. Makes the box
  # diagnosable with ping from an administrative network without widening the
  # surface for everyone else.
  dynamic "rule" {
    for_each = length(var.ssh_allowed_cidrs) > 0 ? [1] : []
    content {
      direction  = "in"
      protocol   = "icmp"
      source_ips = var.ssh_allowed_cidrs
    }
  }
}

################################################################################
# Data volume for the Postgres data directory (optional)
#
# `format` is set here so HETZNER formats the volume exactly once, at creation.
# Formatting must never happen in cloud-init: user_data re-runs on rebuild, and
# an `mkfs` there would silently destroy the database. Cloud-init only mounts.
#
# The volume is a separate resource from the server, so replacing the server
# (an image change, a rebuild) preserves the data. It does NOT survive
# `terraform destroy` of the root: see the README before treating it as a
# backup — it is not one.
################################################################################
resource "hcloud_volume" "data" {
  count = local.data_volume_enabled ? 1 : 0

  # Volume and server must share a location, or the attachment fails.
  format   = "ext4"
  labels   = var.labels
  location = var.location
  name     = "${var.name}-data"
  size     = var.data_volume_size_gb
}

resource "hcloud_volume_attachment" "data" {
  count = local.data_volume_enabled ? 1 : 0

  # Let Hetzner attach the device; the filesystem is mounted by cloud-init via
  # the stable /dev/disk/by-id path exposed as the `data_volume_device` output,
  # never by kernel device name (which is not stable across reboots).
  automount = false
  server_id = hcloud_server.this.id
  volume_id = hcloud_volume.data[0].id
}

################################################################################
# Server
################################################################################
resource "hcloud_server" "this" {
  backups      = var.backups_enabled
  firewall_ids = var.firewall_enabled ? [hcloud_firewall.this[0].id] : []
  image        = var.image
  # Ladder rung 1. See the keep_disk variable for why growing the boot disk is
  # a one-way door.
  keep_disk   = var.keep_disk
  labels      = var.labels
  location    = var.location
  name        = var.name
  server_type = var.server_type
  ssh_keys    = var.ssh_key_ids
  user_data   = var.user_data

  public_net {
    ipv4_enabled = var.ipv4_enabled
    ipv6_enabled = var.ipv6_enabled
  }

  lifecycle {
    # user_data is applied only at first boot, so a template change cannot take
    # effect without replacing the server. Ignoring it prevents Terraform from
    # proposing a destroy/recreate — which would discard the Docker volumes on
    # the boot disk, including Postgres data when data_volume_size_gb is 0 —
    # every time an unrelated edit touches the rendered script.
    #
    # The consequence: changes to the startup template do NOT reach a running
    # server. Roll them out by re-running the script over SSH, or replace the
    # server deliberately with `terraform taint` once the data lives on the
    # attached volume.
    ignore_changes = [user_data]
  }
}
