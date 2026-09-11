locals {
  # env_name names the ENVIRONMENT, never the provider, so resources read
  # openthrottle-production-* on either provider path. The directory name carries
  # the provider variant instead.
  project_env = "production"

  # Hetzner location. Changing this replaces the server, and a data volume cannot
  # move between locations — see modules/hcloud_server/README.md.
  project_location = "nbg1"
}
