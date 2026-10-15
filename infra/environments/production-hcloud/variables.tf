# Values for this root that must stay out of git. This repository is public:
# the STRUCTURE of the deployment is safe to publish, its admin IPs are not.
#
# Supply them through terraform.tfvars (gitignored — copy
# terraform.tfvars.example) or TF_VAR_* environment variables. Everything that
# is safe to publish stays a literal in openthrottle.tf.

variable "ssh_allowed_cidrs" {
  description = "Administrative source ranges allowed to reach port 22, e.g. [\"203.0.113.4/32\"]. Required and non-empty: production needs SSH for the one-time bootstrap and for diagnosis. The deploy workflow does NOT need an entry here — it opens the separate deploy firewall for its own IP per run."
  type        = list(string)

  validation {
    condition     = length(var.ssh_allowed_cidrs) > 0
    error_message = "ssh_allowed_cidrs must list at least one administrative range. Empty would leave the Hetzner console as the only way in."
  }

  validation {
    condition     = alltrue([for cidr in var.ssh_allowed_cidrs : can(cidrhost(cidr, 0))])
    error_message = "Every ssh_allowed_cidrs entry must be a CIDR, e.g. \"203.0.113.4/32\" — a bare IP without a prefix length is rejected."
  }
}
