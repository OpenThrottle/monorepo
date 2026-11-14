# Where the money goes

OpenThrottle is an open-core, AI-native platform for planning and shipping software: a
Postgres-backed knowledge base of plans and tasks with semantic search, exposed to your editor
and agents over MCP, plus agentic execution and a developer dashboard. The core is
Apache-2.0 — see [LICENSING.md](LICENSING.md).

This page exists because the honest answer to "what would sponsorship pay for?" is a bill, and
a bill is a thing you can check.

## What it costs

There are three bills, and they are worth keeping apart, because the one people assume is
largest — hosting — is the smallest.

### 1. Building it — paid out of pocket today

This is the bill that exists right now, with nothing deployed.

| Line item                                      | Category    |  Monthly | What sponsorship covers                                                        |
| ---------------------------------------------- | ----------- | -------: | ------------------------------------------------------------------------------ |
| Claude subscription — the agents that build it | development | **$100** | The coding-agent seat OpenThrottle is developed with. Likely $200 soon (below) |
| Vercel Pro — hosts all four React Router apps  | SaaS        |  **$20** | The public website, docs, and app previews                                     |
| GitHub Pro                                     | SaaS        |   **$5** | The account the repository, issues, and project work run under                 |
| GitHub Actions — CI runners                    | CI          |   **$0** | Lint, typecheck, tests, and codegen-drift checks on every PR                   |
| **Out of pocket today**                        |             | **$125** | **Development and CI, before anything is hosted**                              |

> **Every figure is the owner's real billing amount.** OpenThrottle is built agent-first, so
> the agent seat is the largest recurring cost, and heavier use moves it to the
> **$200/month** plan. CI is free because it runs on GitHub's standard runners, which cost
> nothing on a public repository. Paid runners such as Blacksmith are not in use. Bringing one
> back means pricing it first ([docs/monorepo/ci-cost.md](docs/monorepo/ci-cost.md)), and if
> the repository ever goes private, every CI minute starts billing.

### 2. Hosting it — the floor

OpenThrottle is not deployed anywhere yet. The cheapest supported way to change that is
[the Hetzner option](infra/HOSTING-OPTIONS.md): one box running Caddy, the API, workers, the
MCP server, Postgres, and Redis as containers.

| Line item                          | Category |      Monthly | What sponsorship covers                                            |
| ---------------------------------- | -------- | -----------: | ------------------------------------------------------------------ |
| Hetzner CX23 server, backups, IPv4 | hosting  |    **€7.09** | OpenThrottle deployed and reachable, Postgres and Redis on the box |
| Offsite nightly `pg_dump` target   | backups  | _UNVERIFIED_ | A backup that survives losing the box                              |

Priced in [`infra/hetzner-estimate.csv`](infra/hetzner-estimate.csv) (excl. VAT). The
trade is operational, not financial: backups, restores, and Postgres upgrades become work
someone does.

### 3. Hosting it properly — managed GCP

Managed Postgres with point-in-time recovery and failover, Redis that survives maintenance,
and separate staging and production. This is what you would point people at, and it is where
the money would go if sponsorship outgrew the floor.

| Tier                      |     Monthly | What it is                                                                                |
| ------------------------- | ----------: | ----------------------------------------------------------------------------------------- |
| GCP, one environment      |  **$98.52** | Cloud SQL PostgreSQL + pgvector, Memorystore, one VM. Single zone, no HA                  |
| GCP, staging + production | **$431.55** | Split API/worker, HA Postgres with PITR, Memorystore Standard, real log retention, a demo |

Line items, method, and each tier's failure modes are in
[`infra/estimates/README.md`](infra/estimates/README.md). The single largest swing factor is
the database: an HNSW index build over a much larger corpus outgrows `db-g1-small`, and the
next step up adds **$49.31/month** on its own.

### Why Vercel stays either way

Moving the four React Router apps off Vercel costs roughly **$57.67/month** on Cloud Run
before request-time compute, and gives up preview deployments, which the PR review workflow
depends on. So Vercel, GitHub, and the Claude seat are **ongoing** costs under
every hosting option — sponsorship helps carry them; no migration retires them. Math in
[`infra/estimates/gcp-apps-on-cloud-run-2026-08-17.csv`](infra/estimates/gcp-apps-on-cloud-run-2026-08-17.csv).

## The goal

OpenThrottle runs on a laptop today. The four React Router apps on Vercel are the only part of
the system the public can reach.

Recurring sponsorship turns it into a **production-deployable toolset** rather than a repo you
have to build yourself to evaluate. Concretely, it buys three things:

1. **Development that keeps going.** The agent seat and CI are what ship every change; they
   should not depend on one person's budget.
2. **A public environment to actually try.** A deployment people can visit, instead of asking
   them to run `./scripts/setup.sh` and a Postgres container before they can form an opinion.
3. **A path to running it properly.** Past the floor, managed Postgres and a staging
   environment, priced above.

## Tiers

Each tier maps to a real bill, not to invented perks. The one exception says so.

### Monthly

| Tier                | Monthly | What it actually funds                                                                                  |
| ------------------- | ------: | ------------------------------------------------------------------------------------------------------- |
| Support open source |      $5 | No single bill — it backs the project generally, in the same pot as every tier, starting with the floor |
| Keep a box running  |     $10 | The Hetzner floor (€7.09) — OpenThrottle deployed and reachable                                         |
| Fund the agents     |    $100 | The Claude subscription OpenThrottle is built with today                                                |
| Build and host it   |    $200 | The $200 agent plan heavier development needs — or the floor plus the start of managed hosting          |

Past $200, sponsorship goes toward managed GCP: $98.52/month for one environment,
$431.55/month for staging plus production.

### One-time

| Tier                              | One time | What it actually funds                                                |
| --------------------------------- | -------: | --------------------------------------------------------------------- |
| Three months of the hosting floor |      $25 | About three months of the Hetzner floor (3 × €7.09)                   |
| A month of the agents             |     $100 | One month of the Claude subscription OpenThrottle is built with today |
| A month of hosting it properly    |     $500 | One month of managed GCP, staging plus production (estimated $431.55) |

Custom amounts are accepted for both monthly and one-time sponsorship; they go into the same
pot as the tiers above.

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
