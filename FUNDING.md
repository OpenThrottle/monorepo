# Where the money goes

OpenThrottle is an open-core, AI-native platform for planning and shipping software: a
Postgres-backed knowledge base of plans and tasks with semantic search, exposed to your editor
and agents over MCP, plus agentic execution and a developer dashboard. The core is
Apache-2.0 — see [LICENSING.md](LICENSING.md).

This page exists because the honest answer to "what would sponsorship pay for?" is a bill, and
a bill is a thing you can check.

## What it costs to run

OpenThrottle is not deployed anywhere today. The numbers below are what it would take to
change that, priced from what the project actually runs — `docker-compose.yml` reconciled
against the Terraform in [`infra/`](infra/). Two tiers, because "keep it reachable" and "run
it properly" are genuinely different bills.

Full line-item detail, method, and the failure modes of each tier are in
[`infra/estimates/README.md`](infra/estimates/README.md).

| Line item                                         | Category |     Monthly | Tier         | What sponsorship covers                                                      |
| ------------------------------------------------- | -------- | ----------: | ------------ | ---------------------------------------------------------------------------- |
| Compute — API + worker + MCP, disks, IPs          | hosting  |      $30.11 | required     | One instance running the GraphQL API, job workers, and the MCP server        |
| Cloud SQL PostgreSQL + pgvector, storage, backups | database |      $30.55 | required     | The database behind plans, tasks, and semantic search                        |
| Memorystore Redis — BullMQ queues                 | queues   |      $35.77 | required     | The queue every scheduled job and agent run depends on                       |
| Artifact Registry, Cloud Storage, Secret Manager  | platform |       $2.09 | required     | Container images, Terraform state, and secrets                               |
| Logging, egress, TLS                              | network  |       $0.00 | required     | Free-tier today; Caddy handles TLS, so there is no load balancer bill        |
| **Required subtotal**                             |          |  **$98.52** | **required** | **OpenThrottle is deployed and reachable**                                   |
| Compute — split API/worker, staging, voice        | hosting  |     $142.25 | desired      | API and workers on separate machines, plus a public staging environment      |
| Cloud SQL with HA + PITR, staging database        | database |     $148.57 | desired      | Automatic failover and point-in-time recovery instead of restore-from-backup |
| Memorystore Standard + staging Redis              | queues   |      $89.79 | desired      | Queue state survives a maintenance event                                     |
| Artifact Registry, Cloud Storage, Secret Manager  | platform |       $5.69 | desired      | Same, across two environments                                                |
| Log retention, egress, load balancer              | network  |      $45.25 | desired      | Real log retention and a demo environment people can actually visit          |
| **Desired subtotal**                              |          | **$431.55** | **desired**  | **Staging + production, run the way you would want to run it**               |
| Vercel — hosts all four React Router apps         | SaaS     |      _TODO_ | ongoing      | Paid out of pocket today. **A GCP move does not retire this** — see below    |
| Blacksmith — CI runners                           | CI       |      _TODO_ | ongoing      | Paid out of pocket today. CI runs regardless of where the app is hosted      |
| GitHub — org plan                                 | SaaS     |      _TODO_ | ongoing      | Paid out of pocket today. Does not go away                                   |
| **Currently paid out of pocket**                  |          |      _TODO_ | **ongoing**  | **The bill that exists right now, with nothing deployed**                    |

> **The three SaaS rows are not yet filled in.** They need real amounts read off the billing
> pages, not estimates, and this page will not carry invented numbers in the meantime. The GCP
> figures above are complete and traceable to the committed CSVs.

### Why Vercel is not retired by a GCP move

It is tempting to say sponsorship replaces the hosting bill. It does not, and the funding page
should not imply otherwise. Moving the four React Router apps to Cloud Run costs roughly
**$57.67/month** before any request-time compute or CDN egress — more than a Vercel seat — and
it gives up preview deployments, which the PR review workflow depends on. The apps stay on
Vercel. Full math in
[`infra/estimates/gcp-apps-on-cloud-run-2026-08-17.csv`](infra/estimates/gcp-apps-on-cloud-run-2026-08-17.csv).

So Vercel, Blacksmith, and GitHub are all **ongoing** costs that sponsorship helps carry,
alongside the GCP bill that does not exist yet.

### How the tiers line up with the ask

- **$100/month covers the required tier.** It is $98.52. That is not a rounded-up
  coincidence — the floor genuinely fits inside the lower tier, with $1.48 to spare.
- **$200/month covers the floor plus about $101 toward the desired setup**, which is roughly
  a quarter of the $431.55 it would take to run staging and production properly.
- **The desired tier is deliberately above the ask.** Reporting it honestly is the point:
  it shows sponsorship has somewhere to grow rather than a ceiling it quietly hits.

The single largest swing factor is the database. `db-g1-small` holds today's corpus, but an
HNSW index build over a materially larger one will run out of memory, and the next step up
costs **$49.31/month** — nearly doubling the database line on its own.

## The goal

OpenThrottle runs on a laptop today. Nothing is deployed — `infra/environments/staging` exists
but is commented out, and the four React Router apps on Vercel are the only part of the system
the public can reach.

Recurring sponsorship is what turns it into a **production-deployable toolset** rather than a
repo you have to build yourself to evaluate. Concretely, it buys three things:

1. **A public environment to actually try.** A staging deployment people can visit, instead of
   asking them to run `./scripts/setup.sh` and a Postgres container before they can form an
   opinion.
2. **Migration off personally-funded SaaS.** Vercel, Blacksmith, and GitHub currently come out
   of one person's pocket. Sponsorship carries them.
3. **CI capacity that isn't a personal expense.** Every PR runs lint, typecheck, tests, and
   codegen-drift checks across the monorepo. That has a real cost and it scales with
   contribution.

## Tiers

The two tiers map to the two priced footprints above, not to invented perks.

| Tier                 | Monthly | What it actually funds                                                                                                                    |
| -------------------- | ------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Keep the lights on   |    $100 | The **required** floor, priced at $98.52 — one environment, single zone, no HA. OpenThrottle deployed and reachable.                      |
| Staging + production |    $200 | The floor plus roughly a quarter of the **desired** setup at $431.55 — split API/worker, HA Postgres, Redis failover, a demo environment. |

Smaller amounts map to real line items rather than to benefits:

- **$36/month** ≈ the Memorystore Redis instance every queued job depends on.
- **$31/month** ≈ the Cloud SQL PostgreSQL instance behind plans, tasks, and semantic search.
- **$30/month** ≈ the compute running the API, workers, and MCP server.

## What sponsorship does not include

Short, because it matters:

- **No license grant beyond Apache-2.0.** Sponsoring does not relicense anything, and it does
  not grant rights to the commercial modules reserved under the separate EULA
  ([LICENSE-EULA.md](LICENSE-EULA.md), [LICENSING.md](LICENSING.md)).
- **No trademark rights.** The OpenThrottle name and marks stay reserved — see
  [TRADEMARK.md](TRADEMARK.md). Sponsorship is not permission to use them.
- **No support contract and no SLA.** Nothing here is a commitment to respond, fix, or
  maintain on any timeline.
- **No roadmap influence, no private features.** Sponsors do not get a vote, early access, or
  anything that is not in the public repo.

## Other ways to help

Money is not the only useful contribution, and for most people it is not the best one:

- **File an issue** when something is broken, confusing, or missing.
- **Open a PR** — see [CONTRIBUTING.md](CONTRIBUTING.md) for the change loop and setup.
- **Improve the docs.** The fastest way to find out where they are wrong is to follow them.
