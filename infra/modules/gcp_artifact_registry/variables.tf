variable "project_id" {
  description = "GCP project ID that owns the repository."
  type        = string
}

variable "location" {
  description = "Artifact Registry location (region), e.g. us-west2 for us-west2-docker.pkg.dev."
  type        = string
  default     = "us-west2"
}

variable "repository_id" {
  description = "Repository id (last segment of the image path before the image name). CI uses openthrottle."
  type        = string
  default     = "openthrottle"
}

variable "description" {
  description = "Human-readable description for the repository."
  type        = string
  default     = "Docker images for OpenThrottle (openthrottle-server, openthrottle-developer)."
}

variable "labels" {
  description = "Labels to attach to the repository resource."
  type        = map(string)
  default     = {}
}

variable "repository_writer_members" {
  description = "IAM members granted roles/artifactregistry.writer on this repository only (e.g. serviceAccount:ci@project.iam.gserviceaccount.com for GitHub Actions docker push)."
  type        = list(string)
  default     = []
}
