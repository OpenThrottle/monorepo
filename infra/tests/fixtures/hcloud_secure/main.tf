# Fixture: a correctly-configured Hetzner box + firewall.
#
# POSITIVE fixture — it must PASS every policy in tests/policy/security.rego.
# Its job is to prove rules 5-7 do not false-positive against real HCL with
# literal values (80/443 open to the internet is correct for a public web
# endpoint, and must not be flagged).
#
# The NEGATIVE cases — SSH open to the world, an exposed database port, backups
# explicitly disabled — are covered by the Rego unit tests in
# tests/policy/security_test.rego, because a fixture that violates a policy
# would fail the `conftest test` run this directory is part of.
#
# Written with literal rules rather than the `dynamic` blocks
# modules/hcloud_server uses, on purpose: Conftest evaluates HCL statically and
# cannot see into a dynamic block, so only a literal fixture exercises the rules
# at all.

terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.54"
    }
  }
}

resource "hcloud_firewall" "secure" {
  name = "openthrottle-fixture-firewall"

  # Public web endpoint: open to the internet by design. Caddy also needs 80
  # reachable for the ACME HTTP-01 challenge, not merely for a redirect.
  rule {
    direction  = "in"
    port       = "80"
    protocol   = "tcp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    port       = "443"
    protocol   = "tcp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  # SSH scoped to an administrative range — never 0.0.0.0/0.
  rule {
    direction  = "in"
    port       = "22"
    protocol   = "tcp"
    source_ips = ["203.0.113.4/32"]
  }

  # Deliberately NO rule for 5432 or 6379.
}

resource "hcloud_server" "secure" {
  # This host holds the Postgres data directory, so backups stay on.
  backups      = true
  firewall_ids = [hcloud_firewall.secure.id]
  image        = "ubuntu-24.04"
  location     = "nbg1"
  name         = "openthrottle-fixture"
  server_type  = "cx22"
}
