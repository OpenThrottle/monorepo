################################################################################
#
#   Example Hetzner environment — copy this directory to start your own.
#
#   NO BACKEND BLOCK ON PURPOSE. State placement is yours to choose, and a
#   hardcoded bucket would be wrong for everyone but us. Pick one and add it:
#
#     # Local state. Fine to evaluate with; do NOT run a real deployment this
#     # way — state holds generated passwords, and losing it orphans the server.
#     (no backend block; Terraform defaults to local)
#
#     # S3-compatible (Hetzner Object Storage, AWS, MinIO, ...):
#     backend "s3" {
#       bucket = "my-terraform-state"
#       key    = "openthrottle/production.tfstate"
#       region = "eu-central-1"
#     }
#     # ⚠️ Verify state LOCKING works before anything real lands on it. An
#     # S3-compatible backend without locking lets two concurrent applies
#     # interleave and corrupt state, and the backend accepting your config is
#     # NOT evidence that locking is on.
#
#     # Terraform Cloud (free tier). Also the tidiest way to keep sensitive
#     # values out of a public repo — they live as workspace variables:
#     cloud {
#       organization = "my-org"
#       workspaces { name = "openthrottle-production" }
#     }
#
################################################################################
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.54"
    }
  }
}
