# Hetzner topology and sizing

Decision record for adding Hetzner as a hosting option. Written as the gate before any Terraform
(OT plan `5f87845e-abcf-463c-9c51-984d55b3d336`, task 1). Cost lines live in
[hetzner-estimate.csv](./hetzner-estimate.csv); the cross-provider variable contract lives in
[provider-contract.md](./provider-contract.md).

GCP is **not** being decommissioned. `applications/openthrottle` stays supported, and this document
covers only what is specific to the Hetzner path: how big the box needs to be, and how it grows.

## Prerequisite: the GCP path has never been applied

Worth stating before any sizing argument, because it sets how much to trust the numbers being
mirrored.

`applications/openthrottle` composes Cloud SQL Postgres, Memorystore Redis and Compute E2 — but it
is instantiated nowhere:

- `environments/staging/openthrottle.tf` — the `module "openthrottle"` block is commented out, with
  a `STATUS: NOT ACTIVE` banner saying so explicitly.
- `environments/production/` — no `openthrottle.tf` at all.
- `environments/development/main.tf` — a comment-only placeholder.

So Cloud SQL, Memorystore, the E2 instance, the 80/443 firewall, the Redis peering address and the
`artifactregistry.reader` binding have never been applied. `gcp-estimate.csv`'s 52.61 USD/mo was a
Pricing Calculator projection, **not a bill**.

Three consequences:

1. **There is no data to migrate off GCP.** No GCP Postgres holds production data and no GCP endpoint
   serves traffic. The database task is therefore a _seed from a dump_, not a cutover — the
   authoritative source is the local Docker Postgres volume described in `databases/README.md`.
2. **The cost comparison is avoided spend, not recovered spend.** Standing this stack up on Hetzner
   costs ~EUR 5.39/mo where standing the _same_ stack up on GCP would have cost ~50 USD/mo. Nobody is
   currently paying the ~50.
3. **DNS rollback needs a live target to roll back to.** The cutover task assumes rolling back is a
   DNS change to the GCP deployment. That is only true once the GCP composition is actually applied.
   Until then the rollback target is whatever serves those hostnames today — establish that before
   changing any record.

The GCP resources that _do_ exist are CI support, not application hosting: Artifact Registry
(staging + production), the GCS Nx cache and Terraform state buckets, and two `gcs-workflow` service
accounts. All stay.

## Rung 0: one CX22

**Decision: start on CX22** (2 vCPU / 4 GB / 40 GB NVMe), not CX32.

The gate for this decision was whether the container memory limits sum past ~3 GB. They do not.

| Service     | Current limit (E2 template) | Hetzner limit | CPU  | Note                                         |
| ----------- | --------------------------- | ------------- | ---- | -------------------------------------------- |
| `caddy`     | 128m                        | 128m          | 0.25 | Unchanged; it only proxies.                  |
| `server`    | 512m                        | 640m          | 0.75 | NestJS + TypeORM pool + graphql-ws + BullMQ. |
| `developer` | 384m                        | 448m          | 0.50 | React Router SSR.                            |
| `postgres`  | —                           | 768m          | 0.50 | New. pgvector; `shm_size: 128mb`.            |
| `redis`     | —                           | 160m          | 0.25 | New. BullMQ queues + cache only.             |
| `mcp`       | —                           | 256m          | 0.25 | New. Node HTTP transport.                    |
| **Total**   | **1024m**                   | **2400m**     |      | 2.34 GB of 4 GB.                             |

Adding ~400 MB for Ubuntu plus the Docker daemon puts steady state near 2.75 GB, leaving roughly
1.2 GB for the page cache. That is comfortable for this dataset: the nightly dump is ~63 MB
compressed, so the entire working set fits in page cache with room to spare, which is what makes a
768m Postgres limit reasonable rather than tight.

Boot is not the peak. The `migrations` one-shot runs while `server`, `developer` and `mcp` are still
gated behind `service_completed_successfully`, so the boot-time set is postgres + redis + migrations
(~1.3 GB) — well under steady state.

**The honest caveat: RAM is not the binding constraint — 2 shared vCPUs are.** The nominal CPU
limits sum to 2.5 against 2 vCPU. That is legal (Compose `cpus` is a ceiling, not a reservation, and
these services do not saturate simultaneously) but it means the first symptom of real traffic will be
CPU contention between the two SSR/API Node processes, not an OOM kill. Expect the move to CX32 or a
CPX instance to be driven by CPU. Because server type is a single variable, that is a one-line change
— see rung 1.

## Scaling ladder

Each rung must be reachable without restructuring. That constraint is why the application module's
variable contract matters more than any individual resource.

### Rung 0 — one CX22, everything co-located

Where we start. Caddy terminates TLS and proxies by hostname; Postgres and Redis are containers
reachable only on the Compose network.

### Rung 1 — a bigger box

Change `server_type` in the environment root and apply.

Two Hetzner-specific gotchas the module README must state, because neither is recoverable by editing
Terraform after the fact:

- **Resize is stop / resize / start.** It is not live. Expect downtime, and expect Terraform to show
  the instance being modified in place rather than replaced.
- **Disk growth is one-way.** A larger server type grows the boot disk and you cannot shrink it back;
  moving to a smaller type afterwards requires a rebuild. Size up deliberately.

The second gotcha is the argument for putting the Postgres data directory on an **attached volume**
rather than the boot disk: volume storage then scales independently of server type and survives a
rebuild of the instance. At rung 0 a named Docker volume on the boot disk is sufficient for 63 MB of
data, so the attached volume is optional — but the module must support it from the start, because
retrofitting it later means moving a live data directory.

### Rung 2 — move Postgres off the box

This is the rung the whole design protects, and it is protected by one decision: **the application
talks to `POSTGRES_HOST` / `POSTGRES_PORT`, never to the Compose service name.**

`postgres_host` and `postgres_port` are therefore exposed as application-module variables that
_default_ to the on-box container. Pointing them at a second Hetzner box, or at Neon or any managed
Postgres, is a variable change with no application change and no template restructure.

Do not "simplify" this by hardcoding `postgres` into the generated `.env`. That single shortcut is
what would turn rung 2 from a variable change back into a rewrite.

One constraint on what rung 2 can point at: the server holds long-lived connections (TypeORM pool,
graphql-ws subscriptions, BullMQ). A serverless connection pooler that assumes short-lived
connections is not a drop-in target.

### Rung 3 — split web and worker

Two instances behind the same Caddy configuration, differing only in which Compose services they
start. Not designed in detail here; the prerequisite is rung 2, since a split stack needs Postgres to
be reachable from both boxes.

### Rung 4 — switch providers

Change which application module the environment calls. Every shared variable carries over untouched.
Specified in [provider-contract.md](./provider-contract.md), which is the acceptance criterion for
the `openthrottle_hcloud` module.

## Where the rest of this decision record lives

- **Cross-provider variable contract, per-concern ownership, and the known defects found on the GCP
  path** — [provider-contract.md](./provider-contract.md).
- **Cost lines** — [hetzner-estimate.csv](./hetzner-estimate.csv).

## DNS, as of this writing

`api_domain` and `developer_domain` are module inputs with no defaults, and **no DNS records are
managed in `infra/`**. A `cloudflare` provider is declared in `environments/staging/versions.tf` and
the repo README references a Cloudflare module, but `modules/cloudflare/` does not exist.

DNS is therefore managed outside Terraform today. The cutover task must confirm where
`openthrottle.ai` records actually live, and record their current values, before planning a low-TTL
change — otherwise the "rollback is a DNS change" plan has no documented state to return to.
