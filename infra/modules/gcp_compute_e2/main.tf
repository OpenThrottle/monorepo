# Compute Engine E2 instance with SSD-backed persistent disk (aligned to gcp-estimate.csv).
# E2 Instance + SSD PD in us-west1.

locals {
  zone = var.zone != "" ? var.zone : "${var.region}-a"
}

resource "google_compute_disk" "ssd" {
  name = "${var.name}-ssd"
  type = "pd-ssd"
  size = var.disk_size_gb
  zone = local.zone

  project = var.project_id
  labels  = var.labels
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

  tags = var.network_tags

  allow_stopping_for_update = true
}
