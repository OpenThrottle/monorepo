# Variables for the hcloud_server module (aligned to infra/hetzner-estimate.csv).

variable "name" {
  description = "Name prefix for the server, firewall, and optional data volume."
  type        = string
}

variable "server_type" {
  description = "Hetzner server type (e.g. cx22, cx32, cpx21). Ladder rung 1: this is the single variable to change to scale the box vertically. Resize is stop/resize/start, not live — expect downtime."
  type        = string
  default     = "cx22"
}

variable "location" {
  description = "Hetzner location (nbg1, fsn1, hel1, ash, hil, sin). Changing this after creation REPLACES the server; a data volume cannot move between locations, so pick it once."
  type        = string
  default     = "nbg1"
}

variable "image" {
  description = "Hetzner OS image. Unlike GCP's dated images there is no byte-reproducible pin available here — `ubuntu-24.04` tracks the current build of that release, so an identical apply months apart may install a newer base image. Cloud-init must therefore be idempotent rather than assume a fixed starting state."
  type        = string
  default     = "ubuntu-24.04"
}

variable "user_data" {
  description = "Cloud-init user_data run at first boot. NOTE: readable via the Hetzner API for the life of the server, so it must not contain secrets in plaintext."
  type        = string
  default     = ""
}

variable "backups_enabled" {
  description = "Enable Hetzner's automatic server backups (priced at ~20% of the server cost; see infra/hetzner-estimate.csv). These are whole-server snapshots and are NOT a substitute for a logical pg_dump shipped off the box — a snapshot shares the server's fate for some failure modes."
  type        = bool
  default     = true
}

variable "keep_disk" {
  description = "When resizing server_type, keep the original boot disk size instead of growing it. Defaults to true deliberately: disk growth on Hetzner is ONE-WAY, and once grown the server can never be downgraded to a smaller type. Keeping the disk preserves the ability to scale back down. Safe as a default because Postgres data belongs on the attached volume (data_volume_size_gb), not the boot disk. Set to false only when the boot disk itself genuinely needs to be bigger, accepting that the change is irreversible."
  type        = bool
  default     = true
}

variable "labels" {
  description = "Labels applied to the server and the optional data volume."
  type        = map(string)
  default     = {}
}

################################################################################
# Data volume (optional) — Postgres data directory
################################################################################

variable "data_volume_size_gb" {
  description = "Size of an attached block volume for the Postgres data directory, in GB. 0 disables it and keeps Postgres on a named Docker volume on the boot disk, which is sufficient at rung 0 for a ~63 MB dataset. Set it when storage should scale independently of server_type and survive an instance rebuild. Hetzner's minimum is 10 GB, and volumes can only ever GROW."
  type        = number
  default     = 0

  validation {
    condition     = var.data_volume_size_gb == 0 || var.data_volume_size_gb >= 10
    error_message = "data_volume_size_gb must be 0 (disabled) or at least 10; Hetzner's minimum volume size is 10 GB."
  }
}

################################################################################
# Networking
################################################################################

variable "ipv4_enabled" {
  description = "Attach a public IPv4 address. Required in practice: Caddy must answer the ACME HTTP-01 challenge on port 80, and IPv4-only clients must reach the site. Hetzner bills IPv4 separately from the server."
  type        = bool
  default     = true
}

variable "ipv6_enabled" {
  description = "Attach a public IPv6 address. Free, and harmless to leave on."
  type        = bool
  default     = true
}

variable "firewall_enabled" {
  description = "Create and attach a Hetzner firewall. Hetzner has NO default rules (unlike a GCP VPC), so with this false the server's every port is exposed to the internet — including Docker-published ports. Leave it true."
  type        = bool
  default     = true
}

variable "http_source_ips" {
  description = "Source ranges permitted to reach ports 80 and 443. Defaults to the whole internet, which is intentional for a public web endpoint. Narrow it to a CDN/proxy's egress ranges (e.g. Cloudflare) if the origin should be locked down."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

variable "ssh_allowed_cidrs" {
  description = "Source ranges permitted to reach port 22. An EMPTY list means no SSH ingress at all — valid for a fully immutable box, but then the Hetzner web console is the only way in. Never 0.0.0.0/0: that is rejected by validation, because the GCP module's habit of inheriting SSH from VPC defaults has no Hetzner equivalent and an open port 22 here is genuinely open."
  type        = list(string)
  default     = []

  validation {
    condition     = !contains(var.ssh_allowed_cidrs, "0.0.0.0/0") && !contains(var.ssh_allowed_cidrs, "::/0")
    error_message = "ssh_allowed_cidrs must not open SSH to the whole internet (0.0.0.0/0 or ::/0). Scope it to known administrative ranges, or leave it empty for no SSH ingress."
  }
}

variable "ssh_key_ids" {
  description = "Hetzner SSH keys to install for root, by id, name, or fingerprint. Keys must already exist in the Hetzner project; this module does not create them. Empty is only sensible alongside an empty ssh_allowed_cidrs."
  type        = list(string)
  default     = []
}
