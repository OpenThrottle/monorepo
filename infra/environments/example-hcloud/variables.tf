# Inputs an operator must supply. Copy terraform.tfvars.example to
# terraform.tfvars and fill it in — that file is gitignored, so real values
# never reach a public repository.
#
# Variables (rather than locals) on purpose: they work unchanged with
# `-var-file`, with TF_VAR_ environment variables, and with Terraform Cloud
# workspace variables, which is how you keep values private while the root
# itself stays public.

variable "api_domain" {
  description = "Hostname for the API. Must already resolve to this server, or Caddy cannot complete the ACME HTTP-01 challenge."
  type        = string
}

variable "developer_domain" {
  description = "Hostname for the developer app. Points at the SAME server as api_domain — Caddy routes by hostname."
  type        = string
}

variable "env_name" {
  default     = "production"
  description = "Environment name used in resource names, e.g. openthrottle-production-*."
  type        = string
}

variable "image_tag" {
  description = "Container image tag to deploy, e.g. sha-abc1234. Pin an exact tag; `latest` makes a rebuild change what is running without a Terraform diff."
  type        = string
}

variable "image_registry" {
  default     = "ghcr.io/openthrottle"
  description = "Registry prefix holding the four OpenThrottle images. Override to deploy from your own mirror or a private registry."
  type        = string
}

variable "location" {
  default     = "nbg1"
  description = "Hetzner location (nbg1, fsn1, hel1, ash, hil, sin). Pick once: changing it REPLACES the server, and a data volume cannot move between locations."
  type        = string
}

variable "server_type" {
  default     = "cx22"
  description = "Hetzner server type. cx22 (2 vCPU / 4 GB) runs the whole stack; see infra/hetzner-topology.md for the sizing argument and why CPU, not RAM, is the binding constraint."
  type        = string
}

variable "ssh_allowed_cidrs" {
  default     = []
  description = "Source ranges allowed to reach port 22, e.g. [\"203.0.113.4/32\"]. Hetzner has NO default firewall rules to inherit, so this is explicit and 0.0.0.0/0 is rejected. An empty list means no SSH at all — recoverable only through the Hetzner console. THIS IS THE VALUE MOST WORTH KEEPING OUT OF GIT."
  type        = list(string)
}

variable "ssh_key_ids" {
  default     = []
  description = "Names, ids or fingerprints of SSH keys that ALREADY exist in your Hetzner project. This configuration does not create them."
  type        = list(string)
}

variable "backup_remote" {
  default     = ""
  description = "rclone destination for the nightly offsite database dump, e.g. \"storagebox:openthrottle/backups\". EMPTY DISABLES OFFSITE BACKUPS: Hetzner snapshots alone share the server's fate for some failure modes, so an empty value means the only copy of your data lives on the machine it is meant to protect."
  type        = string
}

variable "data_volume_size_gb" {
  default     = 0
  description = "Attached block volume for the Postgres data directory, in GB (minimum 10). 0 keeps Postgres on the boot disk, which is fine to start. Setting it later is a data migration, not just a variable change — see infra/SCALING.md rung 2a."
  type        = number
}
