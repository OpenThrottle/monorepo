# Variables for Compute Engine E2 + SSD PD module (aligned to infra/estimates/archive/gcp-estimate-2026-03-04-mysql-superseded.csv).

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
  description = "Network tags for firewall targeting (e.g. allow-http-https)."
  type        = list(string)
  default     = []
}
