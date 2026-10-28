# openthrottle_hcloud

The OpenThrottle application composition for **Hetzner Cloud**: one box running Caddy, the server,
the developer app, `mcp`, Postgres and Redis.

This is a **sibling** of [`openthrottle_gcp`](../openthrottle_gcp/README.md) (GCP), not a replacement. Both
providers are supported — see [`infra/provider-contract.md`](../../provider-contract.md).

|             | `openthrottle_gcp` (GCP) | `openthrottle_hcloud` (Hetzner) |
| ----------- | ------------------------ | ------------------------------- |
| Compute     | Compute Engine E2        | one hcloud server               |
| Postgres    | Cloud SQL (managed)      | container on the box            |
| Redis       | Memorystore (managed)    | container on the box            |
| Images from | Artifact Registry        | GHCR                            |
| TLS         | Caddy + ACME             | Caddy + ACME (identical)        |

**That Postgres and Redis are containers here is the entire structural difference**, and it is why
this module declares no database or cache resources: they are described by
`templates/docker-compose.yml.tpl`.

## Usage

```hcl
module "openthrottle" {
  source = "../../applications/openthrottle_hcloud"

  api_domain       = "api.openthrottle.ai"
  developer_domain = "developer.openthrottle.ai"
  env_name         = local.project_env

  deploy_enabled  = true
  developer_image = "ghcr.io/openthrottle/openthrottle-developer:sha-abc123"
  server_image    = "ghcr.io/openthrottle/openthrottle-server:sha-abc123"

  postgres_password = var.postgres_password # sensitive
  ssh_allowed_cidrs = ["203.0.113.4/32"]
  ssh_key_ids       = ["admin-key"]
}
```

Switching an environment from GCP to Hetzner is a change to the `source` line plus dropping the
GCP-only variables — every variable in the contract's shared table carries over untouched. That is
ladder rung 4.

## The variable contract

Governed by [`infra/provider-contract.md`](../../provider-contract.md) and **enforced by
[`infra/tests/contract/check-provider-contract.sh`](../../tests/contract/check-provider-contract.sh)**,
which fails if the shared set drifts, if a shared variable's type differs between the two modules, or
if a provider-specific variable is added without being documented.

Run it from the repo root:

```bash
infra/tests/contract/check-provider-contract.sh
```

### Variables deliberately absent

`project_id`, `network`, `region`, `zone`, `compute_machine_type`, `compute_disk_size_gb`,
`postgres_tier`, `postgres_disk_size_gb`, `postgres_disk_type`, `postgres_public_ip_enabled`,
`postgres_ssl_mode`, `postgres_authorized_networks`, `redis_memory_size_gb`, `redis_tier`,
`artifact_registry_region`.

They are **dropped, not stubbed**. A no-op `postgres_tier` here would read as supported, plan
cleanly, and mislead whoever next tries to size the database. Postgres is a container on this path:
it is sized by a compose `mem_limit`, not an instance tier.

## The rung-2 seam

`postgres_host`, `postgres_port`, `redis_host` and `redis_port` default to the on-box compose service
names and exist **specifically to be overridden**:

```hcl
  # Move Postgres off the box — no application change, no template change.
  postgres_host = "10.0.0.5"
  postgres_port = 5432
```

The application reads `POSTGRES_HOST` / `POSTGRES_PORT` from its environment and never resolves a
compose service name itself. Preserve that: hardcoding `postgres` anywhere but these defaults turns
rung 2 from a variable change back into a rewrite.

One constraint on the override target — the server holds long-lived connections (TypeORM pool,
graphql-ws subscriptions, BullMQ), so a serverless pooler that assumes short-lived connections is not
a drop-in.

## Runbooks

- [`SECRETS.md`](./SECRETS.md) — what the code actually requires at boot, how each secret is
  provisioned without landing in `user_data`, and
  [running agents on the box](./SECRETS.md#agents-on-this-box-agents_enabled): the accepted risk, the
  GitHub token, `agent-secrets.env` and rotation.
- [`CUTOVER.md`](./CUTOVER.md) — DNS/TLS cutover and verifying the public surface with
  [`infra/tests/exposure/verify-exposure.sh`](../../tests/exposure/verify-exposure.sh).
- [`databases/SEEDING.md`](../../../databases/SEEDING.md) — loading a dump into a fresh database, and
  [`verify-restore.sh`](../../../databases/verify-restore.sh) to prove it worked.

## Agents (opt-in)

`agents_enabled = true` runs the agent CLIs (claude, codex, gemini) inside `openthrottle-server`. It is
**off by default**, and off renders a compose file and startup script byte-identical to what this
module produced before the variable existed.

```hcl
  agents_enabled      = true
  server_agents_image = "ghcr.io/openthrottle/openthrottle-server:sha-abc123-agents"

  # An agent turn needs real memory: the server's 640m limit becomes
  # agents_server_mem_limit (1280m), which does not fit a cx23.
  server_type         = "cx33"
  data_volume_size_gb = 20 # /workspaces and /home/agent live beside Postgres
```

Turning it on:

- swaps `openthrottle-server` (and `bootstrap`, which reuses the image) to the `production-agents`
  image, a Debian image with a shell, git, gh and the pinned CLIs, instead of the distroless one;
- bind-mounts `/workspaces` (checkouts and worktrees) and `/home/agent` (gh credentials, git identity,
  CLI login state) as the **only** writable paths besides tmpfs, owned by uid 1000;
- adds `OPENTHROTTLE_WORKSPACE_ROOTS`, `OPENTHROTTLE_CHECKOUT_ROOT` and `OPENTHROTTLE_WORKTREE_ROOT` to
  `.env`, and puts Redis behind a password generated on the box;
- loads an optional, operator-written `agent-secrets.env` into the server only.

**Read [`SECRETS.md`](./SECRETS.md#agents-on-this-box-agents_enabled) first.** An agent turn runs as
the same uid as the server and can read every secret it holds and reach Postgres and Redis. That is an
accepted risk for a single-operator box, and the same page covers creating the GitHub token, the
`agent-secrets.env` format, rotation, and bumping the CLI versions.

The GCP module is untouched and has no equivalent.

## Rolling a change out to an existing box

`user_data` runs once, at first boot, and is in `ignore_changes`, so changing `agents_enabled`, an
image variable or the templates **does not reach a running server**. (Routine image rolls go through
[`hetzner-deploy.yml`](../../../.github/workflows/hetzner-deploy.yml), which rewrites the tags in the
rendered compose file; it keeps a `-agents` suffix.) For anything else, render the startup script and
re-run it:

```bash
cd infra/environments/production-hcloud
terraform apply                      # outputs only: user_data is ignored, so no resource changes
terraform output -raw startup_script > "${TMPDIR:-/tmp}/openthrottle-startup.sh"

IP="$(terraform output -raw ipv4_address)"
scp "${TMPDIR:-/tmp}/openthrottle-startup.sh" root@"${IP}":/usr/local/sbin/openthrottle-startup.sh
ssh root@"${IP}" 'chmod 0700 /usr/local/sbin/openthrottle-startup.sh \
  && bash /usr/local/sbin/openthrottle-startup.sh'
rm -f "${TMPDIR:-/tmp}/openthrottle-startup.sh"
```

Read the `terraform apply` plan: it must show output changes only. A resource change there means
something else drifted and is not part of this procedure.

The script is idempotent. It never regenerates `.secrets`, never formats the data volume, and appends
`REDIS_PASSWORD` to an existing `.secrets` rather than replacing it. It does rewrite `.env`, the
Caddyfile and `docker-compose.yml`, then `pull`s and `up -d --wait`s. Two consequences:

- **Image tags revert to what Terraform has.** If `hetzner-deploy.yml` has rolled the box forward
  since the last apply, bump the `*_image` variables to the deployed tags first, or this rolls it
  back. `grep image: /opt/openthrottle/docker-compose.yml` on the box shows what is running.
- **Hand edits to the compose file or `.env` are lost.** `agent-secrets.env` is not touched.

The first time agents are enabled on a box that has already been running, Redis restarts with
`requirepass`, so queued BullMQ jobs are kept (the data volume persists) but in-flight ones pause
while the server restarts.

## Gotchas

- **`server_image` and `server_image_os` are different things.** The first is the container image for
  `openthrottle-server`; the second is the box's OS image. The `_os` suffix exists only to keep them
  apart.
- **`mcp_domain` defaults to empty**, keeping `mcp` reachable only on the compose network. The MCP
  transport authenticates with `OPENTHROTTLE_MCP_AUTH_TOKEN`; publishing it widens the surface, so
  set a hostname only when a remote client genuinely needs it.
- **Cloud-init changes do not reach a running server** — `user_data` is in `ignore_changes` on the
  underlying module. See [`hcloud_server`](../../modules/hcloud_server/README.md), and
  [Rolling a change out to an existing box](#rolling-a-change-out-to-an-existing-box) for the
  render-and-re-run path.
- **First boot does not provision a login user.** `docker compose run --rm bootstrap` is a manual,
  one-time step, deliberately never automatic, because `up` must never silently provision a
  possibly-shared database.
