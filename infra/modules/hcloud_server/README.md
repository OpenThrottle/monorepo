# hcloud_server

Terraform module for a **Hetzner Cloud server** running the whole OpenThrottle stack on one box,
with a firewall, optional SSH access, and an optional block volume for the Postgres data directory.
Aligned to [`infra/hetzner-estimate.csv`](../../hetzner-estimate.csv).

The GCP counterpart is [`gcp_compute_e2`](../gcp_compute_e2/README.md). Both providers are
supported — see [`infra/provider-contract.md`](../../provider-contract.md) for how their variables
map onto each other, and [`infra/hetzner-topology.md`](../../hetzner-topology.md) for sizing and the
scaling ladder.

## Inputs

| Name                  | Description                                           | Type           | Default                 |
| --------------------- | ----------------------------------------------------- | -------------- | ----------------------- |
| `name`                | Name prefix for server, firewall, and data volume     | `string`       | required                |
| `server_type`         | Hetzner server type — **ladder rung 1**               | `string`       | `"cx22"`                |
| `location`            | Hetzner location; changing it **replaces** the server | `string`       | `"nbg1"`                |
| `image`               | OS image                                              | `string`       | `"ubuntu-24.04"`        |
| `user_data`           | Cloud-init script; **never put secrets here**         | `string`       | `""`                    |
| `backups_enabled`     | Hetzner automatic backups (~20% of server cost)       | `bool`         | `true`                  |
| `keep_disk`           | Keep boot disk size on resize, preserving downgrade   | `bool`         | `true`                  |
| `labels`              | Labels for server and volume                          | `map(string)`  | `{}`                    |
| `data_volume_size_gb` | Postgres data volume; `0` disables, minimum `10`      | `number`       | `0`                     |
| `ipv4_enabled`        | Public IPv4 — required for ACME HTTP-01               | `bool`         | `true`                  |
| `ipv6_enabled`        | Public IPv6                                           | `bool`         | `true`                  |
| `firewall_enabled`    | Create and attach the firewall — **leave this on**    | `bool`         | `true`                  |
| `http_source_ips`     | Ranges allowed to 80/443                              | `list(string)` | `["0.0.0.0/0", "::/0"]` |
| `ssh_allowed_cidrs`   | Ranges allowed to 22; `0.0.0.0/0` is rejected         | `list(string)` | `[]`                    |
| `ssh_key_ids`         | Existing Hetzner SSH keys (id, name, or fingerprint)  | `list(string)` | `[]`                    |

## Outputs

| Name                 | Description                                                   |
| -------------------- | ------------------------------------------------------------- |
| `server_id`          | Server id                                                     |
| `server_name`        | Server name                                                   |
| `ipv4_address`       | Public IPv4 — the A record target                             |
| `ipv6_address`       | Public IPv6 — the AAAA record target                          |
| `firewall_id`        | Firewall id, or `null`                                        |
| `data_volume_id`     | Data volume id, or `null`                                     |
| `data_volume_device` | **Stable** `/dev/disk/by-id/...` path for cloud-init to mount |

## Example

```hcl
module "openthrottle_server" {
  source = "../../modules/hcloud_server"

  name        = "openthrottle-production"
  server_type = "cx22"
  location    = "nbg1"

  backups_enabled     = true
  data_volume_size_gb = 10
  ssh_allowed_cidrs   = ["203.0.113.4/32"]
  ssh_key_ids         = ["my-admin-key"]
  user_data           = local.startup_script
}
```

## Scaling: what is reversible and what is not

### Resizing the server type is not live

`server_type` is the one variable to change (ladder rung 1), but Hetzner implements a resize as
**stop → resize → start**. Terraform shows an in-place modification, which understates it: the
server is powered off for the duration. Plan for downtime.

### Growing a disk is a one-way door

**This is the gotcha most likely to cost you money.** A larger server type comes with a larger boot
disk, and a Hetzner boot disk **can never be shrunk**. Once grown, that server can never be
downgraded to a smaller (cheaper) type again — the only way back is rebuilding onto a new server.

This module therefore defaults `keep_disk = true`, which resizes CPU and RAM while leaving the boot
disk alone, so a downgrade stays possible. The trade-off is that you do not get the extra boot-disk
space that the larger type nominally includes.

That default is only safe because **Postgres data belongs on the attached volume, not the boot
disk.** Set `data_volume_size_gb` and the two concerns decouple entirely: compute scales via
`server_type`, storage scales via the volume, and neither forces the other.

Block volumes are also grow-only, but that matters far less: they grow in 10 GB steps independently
of the server, and an over-sized volume costs a few cents rather than blocking a downgrade.

### The volume is not a backup

The data volume survives **replacing the server** — an image change, a rebuild, a `taint`. It does
**not** survive `terraform destroy` of the root, which deletes the volume and everything on it.

`lifecycle { prevent_destroy = true }` is deliberately **not** set on the volume, because
`prevent_destroy` cannot be driven by a variable and would make teardown of a trial deployment fail
outright. Add it by hand once this deployment is real and long-lived:

```hcl
resource "hcloud_volume" "data" {
  # ...
  lifecycle {
    prevent_destroy = true
  }
}
```

Either way, durability comes from `backups_enabled` plus an offsite logical `pg_dump` — not from the
volume existing.

## Gotchas

### Cloud-init changes do not reach a running server

`user_data` runs **once**, at first boot, and is in `lifecycle.ignore_changes`. Without that, every
edit to the rendered startup template would make Terraform propose destroying and recreating the
server — discarding the Docker volumes on the boot disk, including Postgres data when
`data_volume_size_gb` is `0`.

The consequence is that **editing the startup template has no effect on a running box.** Roll changes
out by re-running the script over SSH, or replace the server deliberately with `terraform taint` once
the data lives on the attached volume.

### user_data is not a secret store

Cloud-init `user_data` is readable through the Hetzner API for the life of the server, and lands in
plaintext on the instance. Never interpolate a password or token into it.

### Never format the volume in cloud-init

`format = "ext4"` on the `hcloud_volume` resource makes **Hetzner** format it exactly once, at
creation. Cloud-init only ever _mounts_ it. An `mkfs` in cloud-init would destroy the database on any
rebuild, and mounting must use the `data_volume_device` output (`/dev/disk/by-id/...`) — kernel names
like `/dev/sdb` are not stable across reboots.

### There is no default firewall to inherit

A GCP instance inherits its VPC's default rules; `gcp_compute_e2` relies on exactly that and defines
no SSH rule at all. **Hetzner has no equivalent.** With `firewall_enabled = false` every port is
exposed to the internet, including anything Docker publishes on the host. With it true, the firewall
is default-deny inbound and only the rules here apply.

Two consequences:

- `ssh_allowed_cidrs` must be set explicitly, and `0.0.0.0/0` is rejected by validation. An empty
  list means **no SSH ingress at all** — recoverable only through the Hetzner web console.
- 5432 and 6379 are never opened. The compose template does not publish them either, so the firewall
  is the second line of defence against a stray `ports:` entry. Do not add them.

### Images are not reproducibly pinned

`gcp_compute_e2` pins a dated image (`debian-12-bookworm-v20260609`) so rebuilds are reproducible.
Hetzner offers no dated equivalent: `ubuntu-24.04` tracks the current build of that release, so an
identical apply months apart may install a newer base. Cloud-init must be idempotent rather than
assume a fixed starting state.
