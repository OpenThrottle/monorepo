# GCP cost estimates

What it would cost to run OpenThrottle on Google Cloud, priced two ways: the **required**
floor that actually runs, and the **desired** setup you would want to point people at.

These are estimates for planning and for the sponsorship ask in [`FUNDING.md`](../../FUNDING.md).
They are not a migration plan — no Terraform here changes as a result of them.

| Tier         | Monthly (us-west1) | What it is                                                                                      |
| ------------ | -----------------: | ----------------------------------------------------------------------------------------------- |
| **Required** |         **$98.52** | One environment, single zone, no HA. OpenThrottle is deployed and reachable.                    |
| **Desired**  |        **$431.55** | Staging + production, split API/worker, HA Postgres, Redis failover, voice, real log retention. |

Line-item detail:

- [`gcp-required-2026-08-17.csv`](gcp-required-2026-08-17.csv)
- [`gcp-desired-2026-08-17.csv`](gcp-desired-2026-08-17.csv)
- [`gcp-apps-on-cloud-run-2026-08-17.csv`](gcp-apps-on-cloud-run-2026-08-17.csv) — decision record for the Vercel question
- [`archive/gcp-estimate-2026-03-04-mysql-superseded.csv`](archive/gcp-estimate-2026-03-04-mysql-superseded.csv) — the old $52.61 estimate, kept for history

## Method, and its limits

Read this before quoting the numbers.

Unit rates for **E2 vCPU/RAM, PD SSD, Memorystore Basic, Cloud SQL shared-core, and Cloud SQL
HDD storage** are derived from the archived Google Cloud Pricing Calculator export — an
authoritative us-west1 export, just of the wrong stack. Dividing its totals by its quantities
recovers the real per-unit rates:

| Rate                             | Derivation       |                Value |
| -------------------------------- | ---------------- | -------------------: |
| E2 vCPU                          | `15.92246 / 730` | $0.021812 /vCPU-hour |
| E2 RAM                           | `8.53671 / 2920` |  $0.0029235 /GB-hour |
| PD SSD                           | `1.70 / 10`      |      $0.17 /GB-month |
| Memorystore Basic                | `17.885 / 365`   |      $0.049 /GB-hour |
| Cloud SQL shared-core (f1-micro) | `7.665 / 730`    |        $0.0105 /hour |
| Cloud SQL HDD storage            | `0.90 / 10`      |      $0.09 /GB-month |

Everything else uses Google's published list prices. **These are list-price derivations, not
Calculator share URLs** — producing a share URL needs an interactive Calculator session, which
this pass could not run. Re-confirm in the Calculator before committing real spend. The two
rates most worth re-checking are **Memorystore Standard M1** ($0.074/GB-hour, the largest
single desired-tier assumption) and **Cloud SQL Enterprise vCPU/RAM** ($0.0413 and $0.0070).

## What actually runs

Derived from `docker-compose.yml` and reconciled against `infra/applications/openthrottle/main.tf`
and `infra/environments/`. Note that `infra/environments/staging/openthrottle.tf` is **commented
out** — nothing is deployed today, so this is a greenfield estimate, not a bill.

| Service                   | Where it comes from                                            | Required                     | Desired                         |
| ------------------------- | -------------------------------------------------------------- | ---------------------------- | ------------------------------- |
| `server`                  | NestJS GraphQL API; `PROCESS_ROLE` is `api` / `worker` / `all` | one VM, role `all`           | two VMs, `api` + `worker` split |
| `postgres`                | pgvector, `vector(1536)` (migration 052)                       | Cloud SQL PostgreSQL, zonal  | + regional HA and PITR          |
| `redis`                   | BullMQ + cache                                                 | Memorystore Basic M1         | Memorystore Standard M1         |
| `mcp`                     | OT MCP server                                                  | co-located on the VM         | co-located on the API VM        |
| `migrations`, `bootstrap` | run-once jobs                                                  | run on the VM, ~$0           | same                            |
| `whisper`                 | compose profile `[voice]` — opt-in                             | **excluded**                 | dedicated VM + model cache      |
| Embeddings                | `packages/node-client/src/embedding.ts`                        | **hosted OpenAI, $0 on GCP** | same                            |
| 4 React Router apps       | `applications/*/vercel.json`                                   | **stay on Vercel**           | stay on Vercel                  |
| TLS / ingress             | Caddy on the VM, Let's Encrypt                                 | **$0, no GCLB**              | optional GCLB for WAF           |

Two of those deserve calling out, because both cut the estimate rather than growing it:

**Embeddings do not need a GPU or a big instance.** `embedding.ts` defaults to OpenAI
`text-embedding-3-small` and only uses Ollama when `OLLAMA_BASE_URL` or
`OLLAMA_EMBEDDING_MODEL` is set — and both are commented out in `.env.default`. Self-hosting
Ollama on GCP would add a large always-on instance to replace an API call that costs cents per
month. Priced as hosted; the local-Ollama path stays a development convenience.

**There is no load balancer line.** The Terraform app module puts Caddy on the E2 instance to
terminate TLS with Let's Encrypt and reverse-proxy by hostname. That avoids the ~$18.25/month
GCLB forwarding rule entirely. It is priced in the desired tier only because a public demo
environment wants Cloud Armor in front of it — and Cloudflare would keep even that at $0.

## What the old estimate got wrong

The archived $52.61/month estimate (2026-03-04) is superseded on five counts:

1. **It prices MySQL.** OpenThrottle is Postgres + pgvector end to end. `db-f1-micro`
   (0.6 GB RAM) cannot build an HNSW index over `vector(1536)` at any useful corpus size.
2. **Redis is billed for half a month.** The Memorystore row is 365 GB-hours, not 730 —
   understating that line by $17.89, which is more than a third of the whole old total.
3. **Storage is on HDD.** `disk_type = "PD_HDD"` is still the Terraform default. Vector
   similarity scans are latency-sensitive; SSD is the right default.
4. **It assumes one compute unit** running `PROCESS_ROLE=all`. Production is two.
5. **It omits the supporting bill entirely** — external IPv4 (a real $3.65/month since
   February 2024), Artifact Registry, Cloud Storage, Secret Manager, logging, egress.

One thing it got right, contrary to how it reads: the **7300 GB-month** storage row is not
7.3 TB. Google's export expresses Cloud SQL storage in **GB-hours** — 10 GB × 730 hours. At
$0.09/GB-month that is the $0.90 shown. No correction needed; the unit label is just confusing.

## What breaks at the required tier

The floor is genuinely a floor. Stated plainly so nobody is surprised:

- **No database failover.** A zonal Cloud SQL instance in a bad zone is down until the zone
  comes back. Recovery is restore-from-backup, which means real downtime and up to a day of
  data loss against a 7-day nightly retention.
- **No queue durability across failover.** Memorystore Basic has no replica. A maintenance
  event drops in-flight BullMQ state; jobs rely on stalled-recovery to come back.
- **`db-g1-small` is shared-core with 1.7 GB.** It holds today's plan/task/code-embedding
  corpus. An HNSW build over a materially larger corpus will OOM. The next step up is
  `db-custom-1-3840` at **$49.31/month** — nearly double the database line — and that is the
  single most likely reason the required total moves.
- **One VM runs everything.** API, worker, MCP, and Caddy share 4 GB. One runaway job
  saturates the box and takes GraphQL down with it.
- **No staging.** Changes go from a laptop to production.

## The Vercel question

Whether the four React Router apps move to GCP is the one decision that moves both the GCP
total and whether the Vercel bill is retired. **They should stay on Vercel.**

Cloud Run + a load balancer costs roughly **$57.67/month** before any request-time vCPU or CDN
egress — more than a Vercel Pro seat — and it does not reproduce preview deployments, which the
PR review workflow depends on. Full math in
[`gcp-apps-on-cloud-run-2026-08-17.csv`](gcp-apps-on-cloud-run-2026-08-17.csv).

The consequence for the funding table: **Vercel is an ongoing cost**, not one a GCP migration
retires. So is Blacksmith, and so is GitHub. Sponsorship covers them; it does not replace them.
