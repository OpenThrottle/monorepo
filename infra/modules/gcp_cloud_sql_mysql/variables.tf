# Variables for Cloud SQL MySQL module (aligned to infra/gcp-estimate.csv).
# CSV: "Cloud SQL for MySQL: Zonal - Micro instance" + "Zonal - Low cost storage" in us-west1.

variable "name" {
  description = "Name of the Cloud SQL instance."
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
  description = "Instance tier (e.g. db-f1-micro for Zonal Micro)."
  type        = string
  default     = "db-f1-micro"
}

variable "disk_size_gb" {
  description = "Storage size in GB. CSV references low-cost storage (e.g. 10 GB)."
  type        = number
  default     = 10
}

variable "disk_type" {
  description = "Disk type: PD_SSD or PD_HDD (use PD_HDD for low-cost storage per CSV)."
  type        = string
  default     = "PD_HDD"
}

variable "database_version" {
  description = "MySQL version (e.g. MYSQL_8_0)."
  type        = string
  default     = "MYSQL_8_0"
}

variable "backup_enabled" {
  description = "Whether automated backups are enabled."
  type        = bool
  default     = true
}

variable "backup_start_time" {
  description = "Start time for daily backups (HH:MM)."
  type        = string
  default     = "03:00"
}

variable "public_ip_enabled" {
  description = "Whether to assign a public IPv4 address."
  type        = bool
  default     = false
}

variable "private_network" {
  description = "VPC network self_link for private IP (optional)."
  type        = string
  default     = null
}

variable "database_flags" {
  description = "List of database flags: [{ name, value }]."
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "deletion_protection" {
  description = "Whether to enable deletion protection."
  type        = bool
  default     = false
}
