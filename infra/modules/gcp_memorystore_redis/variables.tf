# Variables for Memorystore for Redis module (aligned to infra/gcp-estimate.csv).
# CSV: "Redis Capacity Basic M1" in us-west1.

variable "name" {
  description = "Name of the Redis instance."
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

variable "tier" {
  description = "Service tier: BASIC or STANDARD_HA."
  type        = string
  default     = "BASIC"
}

variable "memory_size_gb" {
  description = "Memory size in GB (e.g. 1 for M1)."
  type        = number
  default     = 1
}

variable "redis_version" {
  description = "Redis version (e.g. REDIS_7_2)."
  type        = string
  default     = "REDIS_7_2"
}

variable "network" {
  description = "VPC network id or self_link the instance peers into. The module allocates the peering range itself, so this is the only networking input a caller supplies."
  type        = string
}

variable "reserved_prefix_length" {
  description = "Prefix length of the allocated peering range. 29 is Memorystore's minimum and is sized for a single BASIC instance; widen it only for a larger topology, and only to a range that overlaps nothing else in the VPC."
  type        = number
  default     = 29
}

variable "labels" {
  description = "Labels to attach to the Redis instance."
  type        = map(string)
  default     = {}
}
