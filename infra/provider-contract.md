# The shared provider contract

`infra/` is a **catalog of hosting options**, not a single stack with a history. Two application
compositions target the same OpenThrottle deployment:

| Path                               | Provider         | Postgres / Redis                  | Status                         |
| ---------------------------------- | ---------------- | --------------------------------- | ------------------------------ |
| `applications/openthrottle`        | GCP              | Cloud SQL + Memorystore (managed) | Supported. Read-only baseline. |
| `applications/openthrottle_hcloud` | Hetzner (hcloud) | Containers on the box             | Supported. Added by this plan. |

This file is the contract that keeps them interchangeable. **It is the acceptance criterion for the
`openthrottle_hcloud` module: a diff of the two `variables.tf` files must show only divergence listed
here.** Anything that means the same thing on both providers is spelled and typed identically;
anything genuinely provider-specific is listed as such rather than stubbed on the other side.

Stubbing is the failure mode this guards against. A `postgres_tier` variable on the Hetzner module
that silently does nothing is worse than its absence: it reads as supported, plans clean, and
misleads the next person to size a database.

## Rung 4 of the scaling ladder

The ladder in [hetzner-topology.md](./hetzner-topology.md) has rungs 0–3 within Hetzner. This
contract adds rung 4: **switch providers by changing which application module an environment calls.**

```hcl
# environments/<env>/openthrottle.tf
module "openthrottle" {
  source = "../../applications/openthrottle_hcloud"  # was: ../../applications/openthrottle

  api_domain       = "api.openthrottle.ai"
  developer_domain = "developer.openthrottle.ai"
  env_name         = local.project_env
  server_image     = "ghcr.io/openthrottle/openthrottle-server:sha-abc123"
  developer_image  = "ghcr.io/openthrottle/openthrottle-developer:sha-abc123"
  # ...shared variables below carry over unchanged
}
```

Every variable in the **Shared** table survives that edit untouched. That is the whole point, and it
is why the naming discipline below is worth the pedantry.

## Shared — identical name, type and meaning

These must match exactly across both modules. Changing one without the other breaks rung 4.

| Variable            | Type             | Default            | Notes                                                         |
| ------------------- | ---------------- | ------------------ | ------------------------------------------------------------- |
| `env_name`          | `string`         | —                  | Resource-name prefix.                                         |
| `api_domain`        | `string`         | —                  | Caddy routes this to `openthrottle-server`.                   |
| `developer_domain`  | `string`         | —                  | Caddy routes this to `openthrottle-developer`.                |
| `server_image`      | `string`         | `""`               | Fully-qualified, tag pinned. Registry-agnostic by design.     |
| `developer_image`   | `string`         | `""`               | Same.                                                         |
| `caddy_image`       | `string`         | `"caddy:2-alpine"` | Same on both; Caddy comes from Docker Hub either way.         |
| `postgres_db_name`  | `string`         | `"openthrottle"`   | `POSTGRES_DB`.                                                |
| `postgres_user`     | `string`         | `"openthrottle"`   | `POSTGRES_USER`.                                              |
| `postgres_password` | `string` (sens.) | `""`               | `POSTGRES_PASSWORD`.                                          |
| `deploy_enabled`    | `bool`           | `false`            | Gates the rendered compose + startup script and the firewall. |
| `migrations_image`  | `string`         | `""`               | The server's schema gate. Same SHA as `server_image`.         |
| `mcp_image`         | `string`         | `""`               | `openthrottle-mcp` streamable-HTTP transport.                 |
| `mcp_domain`        | `string`         | `""`               | Empty keeps `mcp` on the compose network only.                |
| `jwt_secret`        | `string` (sens.) | `""`               | Empty = **generate on the instance** at first boot.           |
| `ssh_allowed_cidrs` | `list(string)`   | `[]`               | `0.0.0.0/0` rejected by validation on both paths.             |

These last five **converged** rather than being shared from the start. They began as Hetzner-only
because the GCP path simply lacked the corresponding capability — no `mcp` service, no migrations
runner, no `JWT_SECRET`, no SSH rule. Fixing those defects moved them into this table, which is the
outcome this contract exists to produce: the gate refused to pass until the shared set and this
document agreed.

`server_image` and `developer_image` being registry-agnostic strings is what makes the dual-push
decision work: the same `sha-<GITHUB_SHA>` tag resolves on Artifact Registry or GHCR, and only the
prefix differs.

## Shared in intent, divergent today — the `postgres_host` seam

This is the most important row in this file and the one place the two paths do **not** currently
match. It is recorded as a known divergence with a follow-up, not papered over.

| Path   | How `postgres_host` is set                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------ |
| GCP    | A **computed local**, not a variable: `local.postgres_host` picks the Cloud SQL public or private IP from module output. |
| hcloud | A **variable**, defaulting to the Compose service name `postgres`.                                                       |

Both feed the same `POSTGRES_HOST` env var the server actually reads, so the application is already
portable. What differs is whether an operator can _override_ it. On Hetzner they can — that is
ladder rung 2, moving Postgres off the box. On GCP they cannot without editing the module.

**Follow-up (out of scope here):** add `postgres_host` / `postgres_port` override variables to the
GCP module, defaulting to `null` and falling back to the computed local. That would let a GCP
environment point at Hetzner-hosted or managed Postgres, and would collapse this divergence to zero.

The load-bearing rule, true on both paths: **the server reads `POSTGRES_HOST` from the environment;
the Compose service name is never baked into application config.** Hardcoding `postgres` anywhere
but the Hetzner module's default turns rung 2 from a variable change back into a rewrite.

One constraint on any override target: the server holds long-lived connections (TypeORM pool,
graphql-ws subscriptions, BullMQ). A serverless pooler assuming short-lived connections is not a
drop-in.

## Images: dual-push, permanently

Both providers pull the same build. `.github/workflows/openthrottle-docker.yml` publishes every
image to **both** Artifact Registry and GHCR:

| Registry          | Prefix                                                     | Consumed by                                  |
| ----------------- | ---------------------------------------------------------- | -------------------------------------------- |
| Artifact Registry | `us-west2-docker.pkg.dev/<GOOGLE_PROJECT_ID>/openthrottle` | `applications/openthrottle` (GCP)            |
| GHCR              | `ghcr.io/<owner>`                                          | `applications/openthrottle_hcloud` (Hetzner) |

Dual-push is **not transitional**. The Artifact Registry push may not be removed or gated: the GCP
path pulls from there and stays supported. Equally, GHCR is what lets the Hetzner cloud-init skip the
entire Google Cloud SDK install — which is most of that template's first-boot speed and size win.

### Same digest, not just the same tag

Each image is **built once and re-tagged per registry**, never built per registry. Two builds of the
same source are not bit-identical, so building twice would leave `sha-<GITHUB_SHA>` naming two
different artifacts. The composite action's `registries-additional` input (one prefix per line)
implements this: one `docker build`, then `docker tag` + `docker push` per registry, with `set -e`
aborting the job on the first push failure rather than leaving a SHA resolvable on one registry only.

A half-published SHA is precisely what breaks rung 4, so it fails loudly instead.

### Two gotchas worth not rediscovering

- **GHCR rejects uppercase.** `github.repository_owner` preserves the account's casing
  (`OpenThrottle`), and GitHub Actions expressions have **no `lower()` function**, so
  `ghcr.io/${{ github.repository_owner }}` yields a reference docker refuses as invalid. The workflow
  lowercases it in bash (`${VAR,,}`) and exports `GHCR_REGISTRY` via `$GITHUB_ENV`.
- **The workflow is still disabled** (`if: false`). Adding GHCR deliberately did not re-enable it. It
  is the repo's most expensive workflow for two reasons — no remote build cache, and sha-tagged
  images accumulating with no retention policy. GHCR being free for public repositories fixes only
  the second. Until it is re-enabled, **the GHCR path is wired but dormant**: a Hetzner deploy must
  pull a tag that was published some other way. See
  [docs/monorepo/ci-cost.md](../docs/monorepo/ci-cost.md).

### Accepted cost

Dual-push keeps Artifact Registry storage billing alive permanently, and it grows without bound.
That is an accepted consequence of supporting both providers, quantified as a line in
[hetzner-estimate.csv](./hetzner-estimate.csv) rather than treated as a problem to solve.

## State backend: reuse the existing GCS bucket

**Decision: the hcloud environment root reuses the existing GCS state bucket, under its own
`prefix`.** No existing state is migrated.

```hcl
# environments/production-hcloud/versions.tf
terraform {
  backend "gcs" {
    bucket = "openthrottle-production-terraform-state"
    prefix = "openthrottle/production-hcloud"
  }
}
```

The `prefix` is what keeps the two roots' state files independent inside one bucket, so a
`terraform destroy` of the Hetzner root can never touch GCP state.

### Why reuse rather than move

The existing bucket is already versioned, already has object locking, already has CI credentials
wired, and already satisfies the `tests/policy/security.rego` bucket rules (versioning on any bucket
whose name contains `terraform-state`, plus `uniform_bucket_level_access`). Standing up a second
backend would re-earn all four properties for no benefit.

**Being on GCS does not make a Hetzner deployment a GCP deployment.** State storage is a bookkeeping
concern, not a hosting one. Conflating the two is the intuition worth resisting here.

And the alternative carries real risk for no gain: migrating the _existing_ state is the single most
damaging failure mode available in this plan, and there is now no reason to attempt it, since GCP
stays supported and its state must stay where it is.

### When to revisit

One concrete reason would justify a separate backend: **if someone must be able to run the Hetzner
path with no GCP credentials at all.** Today that is not a requirement — whoever applies this root
also has access to the GCP project. If it becomes one, the options are Hetzner Object Storage via the
`s3` backend, or Terraform Cloud's free tier.

If an S3-compatible backend is ever chosen, **verify state locking works before anything lands on
it.** S3-compatible storage without a locking mechanism is a foot-gun in a two-machine workflow: two
concurrent applies will silently interleave and corrupt state. Do not assume locking from the fact
that the `s3` backend accepts the configuration.

### A note on root naming

The root is `environments/production-hcloud/`, with `project_env = "production"` in its locals. The
directory names the provider variant; `env_name` keeps naming the _environment_, so resources still
read `openthrottle-production-*` rather than leaking a provider name into every resource.

There is a simpler alternative that ladder rung 4 describes literally: have
`environments/production/openthrottle.tf` call `openthrottle_hcloud` instead of `openthrottle`, with
no new root at all. That is arguably purer — provider becomes purely a module choice. A separate root
was chosen because GCP stays supported, and two roots let both variants be configured and compared
side by side rather than being mutually exclusive edits to one file. If the GCP variant is ever
instantiated at the same time, **they must not both serve the same hostnames** — see the DNS note in
[hetzner-topology.md](./hetzner-topology.md).

## Provider-specific — listed, never stubbed

### GCP only

| Variable                           | Why it cannot cross                                                                                                                  | Hetzner analogue                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `project_id`                       | GCP project is a GCP concept.                                                                                                        | none                                                         |
| `network`                          | VPC self-link; also carries Redis peering.                                                                                           | none (Compose network)                                       |
| `region`, `zone`                   | GCP placement vocabulary.                                                                                                            | `location`                                                   |
| `compute_machine_type`             | `e2-micro` is not a Hetzner word.                                                                                                    | `server_type`                                                |
| `compute_disk_size_gb`             | Boot disk is sized by the server type on Hetzner.                                                                                    | `data_volume_size_gb`                                        |
| `postgres_tier`                    | Cloud SQL instance sizing.                                                                                                           | none — it is a container                                     |
| `postgres_disk_size_gb`            | Cloud SQL storage.                                                                                                                   | `data_volume_size_gb`                                        |
| `postgres_disk_type`               | `PD_SSD` / `PD_HDD`.                                                                                                                 | none                                                         |
| `postgres_public_ip_enabled`       | Cloud SQL networking.                                                                                                                | none                                                         |
| `postgres_ssl_mode`                | Cloud SQL TLS enforcement.                                                                                                           | none — never leaves the host                                 |
| `postgres_authorized_networks`     | Cloud SQL IP allowlist.                                                                                                              | none                                                         |
| `redis_memory_size_gb`             | Memorystore sizing.                                                                                                                  | none — `mem_limit`                                           |
| `redis_tier`                       | `BASIC` / `STANDARD_HA`.                                                                                                             | none                                                         |
| `artifact_registry_region`         | Builds the `*-docker.pkg.dev` host.                                                                                                  | none — GHCR has one host                                     |
| `postgres_ssl_reject_unauthorized` | Cloud SQL presents a per-instance CA that is not in the public trust store, so chain verification fails unless that CA is installed. | none — Postgres is reached over the compose network, not TLS |

The Cloud SQL and Memorystore rows collapsing to "it is a container" is the substance of the cost
difference. It is also the substance of the operational difference: those knobs bought managed
backups, and on Hetzner that becomes owned work.

### Hetzner only

Verified against `applications/openthrottle_hcloud/variables.tf`.

| Variable              | Type           | Default                 | Why it cannot cross                                                    |
| --------------------- | -------------- | ----------------------- | ---------------------------------------------------------------------- |
| `server_type`         | `string`       | `"cx22"`                | Ladder rung 1. Resize is stop/resize/start; disk growth is one-way.    |
| `location`            | `string`       | `"nbg1"`                | Hetzner datacenter. Changing it replaces the server.                   |
| `server_image_os`     | `string`       | `"ubuntu-24.04"`        | hcloud OS image. Named `_os` to keep it distinct from `server_image`.  |
| `backups_enabled`     | `bool`         | `true`                  | Hetzner's ~20%-of-server backup option.                                |
| `data_volume_size_gb` | `number`       | `0` (off)               | Attached volume for the Postgres data dir. No Cloud SQL equivalent.    |
| `ssh_allowed_cidrs`   | `list(string)` | `[]`                    | **Not optional in practice** — see below.                              |
| `ssh_key_ids`         | `list(string)` | `[]`                    | GCP used project metadata / OS Login.                                  |
| `http_source_ips`     | `list(string)` | `["0.0.0.0/0", "::/0"]` | The GCP module hardcodes `0.0.0.0/0` in its firewall resource instead. |
| `mcp_domain`          | `string`       | `""`                    | `mcp` is absent from the GCP compose entirely.                         |
| `labels`              | `map(string)`  | `{}`                    | Spelled the same as GCP's `labels`, but scopes hcloud resources.       |

Two backup variables are Hetzner-only, because on GCP this was Cloud SQL's job:

| Variable                 | Type     | Default | Note                                                             |
| ------------------------ | -------- | ------- | ---------------------------------------------------------------- |
| `backup_remote`          | `string` | `""`    | rclone destination. **Empty disables offsite backups entirely.** |
| `backup_retention_count` | `number` | `14`    | Mirrors `DATABASE_BACKUP_RETENTION_COUNT`, not a second scheme.  |

The app's own scheduled backup job **cannot** substitute for these: it spawns
`pnpm run database:backup` in a workspace checkout, and a deployed box runs the server from a
distroless image with no pnpm, no tsx and no workspace. That makes the built-in nightly backup a
local-workstation feature on **both** provider paths — so a GCP deployment would have had no logical
backup either, beyond whatever Cloud SQL provided.

Three secret variables are Hetzner-only, and their defaults are the design rather than a
convenience — see
[`applications/openthrottle_hcloud/SECRETS.md`](./applications/openthrottle_hcloud/SECRETS.md):

| Variable        | Type             | Default | Note                                                                             |
| --------------- | ---------------- | ------- | -------------------------------------------------------------------------------- |
| `jwt_secret`    | `string` (sens.) | `""`    | `""` = **generate on the box** at first boot; never enters state or `user_data`. |
| `ghcr_username` | `string`         | `""`    | `""` = anonymous pull; correct when GHCR packages are public.                    |
| `ghcr_token`    | `string` (sens.) | `""`    | The one unavoidable `user_data` secret, and only when packages are private.      |

`BULLMQ_BOARD_ADMIN_USERNAME` / `_PASSWORD` are deliberately **not** variables on either module.
`isBullBoardEnabled()` is `NODE_ENV !== "production"`, and the module's own comment says the
dashboard must stay off in production because it is internet-reachable behind a single shared static
credential. The plan listed these as boot-required; the code says otherwise, and provisioning them
would mean enabling something deliberately kept off.

Two on-box service images stay Hetzner-only, because the GCP path uses managed services for both:

| Variable           | Type     | Default                                 | Note                                                                  |
| ------------------ | -------- | --------------------------------------- | --------------------------------------------------------------------- |
| `migrations_image` | `string` | `""` (required when `deploy_enabled`)   | The server's schema gate. Must carry the same SHA as `server_image`.  |
| `mcp_image`        | `string` | `""` (required when `deploy_enabled`)   | No GCP counterpart — `mcp` is absent there.                           |
| `postgres_image`   | `string` | `"pgvector/pgvector:0.8.2-pg18-trixie"` | Upstream prebuilt; a deployed box cannot build `Dockerfile.Postgres`. |
| `redis_image`      | `string` | `"redis:8.8-alpine"`                    | Tracks `REDIS_VERSION` in `.env.default`.                             |

`migrations_image` and `mcp_image` are now in the **shared** table above — the GCP compose renders
those services too.

Plus the four rung-2 seam variables, which have no GCP counterpart **yet** (see the follow-up in the
`postgres_host` section above): `postgres_host` (`"postgres"`), `postgres_port` (`5432`),
`redis_host` (`"redis"`), `redis_port` (`6379`).

`keep_disk` is intentionally **not** surfaced at the application level. It lives on
`modules/hcloud_server` with a safe default of `true`, and exposing it here would invite flipping it
without reading why that default exists — growing a Hetzner boot disk is irreversible and forecloses
ever downgrading the server type.

`ssh_allowed_cidrs` deserves emphasis. The GCP module's own comment admits it defines no SSH rule and
**relies on the VPC's default rules**, with a warning to confirm 22 is not open to the world. Hetzner
has no such default: a firewall that only allows 80/443 locks you out entirely, and one that omits
SSH from its rule set leaves it wide open depending on how the firewall is attached. It must be
explicit, and it must be scoped — never `0.0.0.0/0`.

## Concerns table

Per-concern ownership, which is what a reader actually wants when deciding whether a provider swap is
safe.

| Concern           | GCP path                                                                                                      | Hetzner path                                                                                                                    | Spellings match?                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Images / registry | Artifact Registry, `artifact_registry_region` + `gcloud auth configure-docker`                                | GHCR, `ghcr_username` / `ghcr_token` + `docker login`                                                                           | **No, by design.** `server_image` / `developer_image` are shared; only the auth mechanism differs. Dual-push keeps one SHA valid on both.                                                                                                                                           |
| Postgres          | Cloud SQL (managed); `postgres_tier`, `postgres_disk_*`, `postgres_ssl_mode`                                  | Container: `postgres_image` (pgvector/pg18), `mem_limit: 768m`, data on a bind mount, **5432 never published**                  | **Partially.** `postgres_db_name` / `_user` / `_password` shared; all sizing and networking knobs are provider-specific. `postgres_host` is the seam — see above.                                                                                                                   |
| Redis             | Memorystore (managed); `redis_memory_size_gb`, `redis_tier`                                                   | Container: `redis_image`, `mem_limit: 160m`, persistent `/data` volume for BullMQ jobs, **6379 never published**                | **No shared variables.** Both feed `REDIS_HOST` / `REDIS_PORT` into the same `.env`.                                                                                                                                                                                                |
| Secrets           | **Defective**: `postgres_password` in plaintext `metadata_startup_script`, and no `JWT_SECRET` written at all | Generated on the box into a root-only file (`jwt_secret`, `postgres_password`), tokens installed by the manual `bootstrap` step | **No.** The generate-on-box and out-of-band-bootstrap halves port to GCP; the registry credential differs by construction (GCP uses the instance service account and needs no token). An external secret store would collapse this to one spelling and becomes necessary at rung 2. |
| TLS / DNS         | Caddy + ACME; `api_domain`, `developer_domain`                                                                | Identical — Caddy + ACME, same two variables                                                                                    | **Yes.** `Caddyfile.tpl` does not diverge. Only the A record's target changes.                                                                                                                                                                                                      |
| State backend     | GCS bucket per environment, versioned, `prevent_destroy`                                                      | **Same** GCS bucket, own `prefix`. No migration.                                                                                | **Yes** — same backend, different prefix. Revisit only if the Hetzner path must run with no GCP credentials at all.                                                                                                                                                                 |
| Backups           | Cloud SQL automated backups (managed)                                                                         | `backups_enabled` snapshots **plus** a host-level nightly `pg_dump` shipped via rclone (`backup_remote`), on a systemd timer    | **No.** The largest genuine operational difference: on Hetzner this is owned work, and it is the real cost of the cheaper bill. Drill procedure in `databases/SEEDING.md`.                                                                                                          |
| Firewall / SSH    | 80/443 rule only; SSH inherited from VPC defaults                                                             | 80/443 **and** SSH must both be explicit; `ssh_allowed_cidrs`                                                                   | **No.** Hetzner has no default rules to inherit.                                                                                                                                                                                                                                    |
| `mcp` service     | **Absent** from the rendered compose                                                                          | Present, no published port; Caddy routes it only when `mcp_domain` is set                                                       | **No.** A known gap on the GCP path, not a Hetzner addition. Follow-up.                                                                                                                                                                                                             |

## Defects fixed on the GCP path

The first pass at this contract found six defects on `applications/openthrottle`, all consequences of
that path never having been applied. Auditing it against the Hetzner path surfaced three more. Eight
are now fixed; the two that remain do not block a deploy.

**Fixed:**

1. **No `JWT_SECRET`** in the rendered `.env` — `jwt.strategy.ts` throws at boot without it. Now
   generated on the instance and persisted, so it never enters metadata or Terraform state.
2. **No `NODE_ENV=production`.** This chained into a second boot failure: `isBullBoardEnabled()` is
   `NODE_ENV !== "production"`, so the Bull Board dashboard tried to mount and hard-required
   `BULLMQ_BOARD_ADMIN_*`, which were never set. It would also have exposed the queue dashboard had
   they been supplied.
3. **`postgres_password` in plaintext** in `metadata_startup_script`, readable by anyone with
   `compute.instances.get`. Now stored in Secret Manager and fetched at boot by the instance's
   service account. It remains in Terraform state, which is unavoidable rather than an oversight —
   Cloud SQL needs the password at instance-create time — but state is access-controlled and
   metadata is not.
4. **No `migrations` service**, so the server could start against whatever schema Cloud SQL happened
   to have. Now present, with the server gated on `service_completed_successfully`.
5. **No `bootstrap` service**, so there was no way to provision the login user or the MCP token. Now
   present and profile-gated, exactly as on the Hetzner path.
6. **No `mcp` service.** Now present, with an optional Caddy route behind `mcp_domain`.
7. **No SSH firewall rule.** The module defined none and relied on the VPC's default rules. Now an
   opt-in, scoped `google_compute_firewall` rejecting `0.0.0.0/0`; leaving `ssh_allowed_cidrs` empty
   preserves the old inherited behaviour rather than silently changing it.
8. **No `POSTGRES_SSL`.** The module defaults Cloud SQL to `ssl_mode = "ENCRYPTED_ONLY"` and then
   connected in cleartext — internally contradictory, and a guaranteed connection failure. Now
   `POSTGRES_SSL=true`, with `postgres_ssl_reject_unauthorized` exposed because Cloud SQL's
   per-instance CA is not publicly trusted.

**Still open, neither blocking:**

- **`gcp-estimate.csv` prices Cloud SQL for MySQL** while the stack runs Postgres. Cosmetic but
  misleading; the total is wrong in kind, not just degree.
- **The composition has still never been applied.** Everything above was fixed by reading the code
  against the Hetzner path, not by deploying. The first real GCP apply remains the first genuine test
  of any of it, and that caveat has not gone away.
