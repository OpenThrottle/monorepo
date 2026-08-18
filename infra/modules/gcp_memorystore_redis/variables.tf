# Variables for Memorystore for Redis module (aligned to infra/estimates/archive/gcp-estimate-2026-03-04-mysql-superseded.csv).
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

variable "reserved_ip_range" {
  description = "CIDR range for the Redis instance (e.g. 10.0.0.0/29). Must be in the VPC and not overlap with other ranges."
  type        = string
}

variable "labels" {
  description = "Labels to attach to the Redis instance."
  type        = map(string)
  default     = {}
}
