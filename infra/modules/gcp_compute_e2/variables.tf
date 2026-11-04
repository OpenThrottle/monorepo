# Variables for Compute Engine E2 + SSD PD module (aligned to infra/gcp-estimate.csv).

variable "disk_size_gb" {
  description = "Size of the SSD persistent disk in GB."
  type        = number
  default     = 10
}

variable "machine_type" {
  description = "GCP machine type (e.g. e2-micro, e2-small)."
  type        = string
  default     = "e2-micro"
}

variable "name" {
  description = "Name prefix for the instance (and optional disk)."
  type        = string
}

variable "network" {
  description = "VPC network id or self_link for the instance."
  type        = string
}

variable "project_id" {
  description = "GCP project ID."
  type        = string
}

variable "region" {
  description = "GCP region (e.g. us-west1)."
  type        = string
  default     = "us-west1"
}

variable "zone" {
  description = "GCP zone (e.g. us-west1-a). If empty, derived from region (first zone)."
  type        = string
  default     = ""
}

variable "boot_image" {
  description = "Boot image family or full dated image for the instance. Pinned to a dated Debian 12 image (not the rolling debian-12 family) so rebuilds are byte-reproducible; bump deliberately to adopt a newer image."
  type        = string
  default     = "debian-cloud/debian-12-bookworm-v20260609"
}

variable "labels" {
  description = "Labels to attach to the instance."
  type        = map(string)
  default     = {}
}

variable "metadata_startup_script" {
  description = "Optional startup script run at first boot (e.g. install Docker, run containers)."
  type        = string
  default     = ""
}

variable "network_tags" {
  description = "EXTRA network tags for the instance, appended to the module's own firewall tag. Rules created by this module do not need a tag from here; this is for targeting the instance with rules declared elsewhere."
  type        = list(string)
  default     = []
}

################################################################################
# Firewall
################################################################################

variable "firewall_enabled" {
  description = "Create the HTTP/HTTPS rule (and the opt-in SSH rule) and tag the instance so they apply to it. False leaves the instance with no rules OF ITS OWN — unlike the Hetzner module, that does not mean closed: the VPC's default rules still apply. The rule used to be created unconditionally while the tag was applied only on deploy, which left an internet-open rule in the project matching a tag nothing carried."
  type        = bool
  default     = true
}

variable "http_source_ranges" {
  description = "Source ranges permitted to reach ports 80 and 443. Defaults to the whole internet, which is intentional for a public web endpoint. Narrow it to a CDN/proxy's egress ranges (e.g. Cloudflare) if the origin should be locked down."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "ssh_allowed_cidrs" {
  description = "Source ranges permitted to reach port 22. An EMPTY list creates no rule, which on GCP means the VPC's default rules decide whether 22 is reachable — safe only if you have verified those defaults. 0.0.0.0/0 is rejected by validation."
  type        = list(string)
  default     = []

  validation {
    condition     = !contains(var.ssh_allowed_cidrs, "0.0.0.0/0")
    error_message = "ssh_allowed_cidrs must not open SSH to the whole internet. Scope it to known administrative ranges, or leave it empty to inherit the VPC's rules."
  }
}
