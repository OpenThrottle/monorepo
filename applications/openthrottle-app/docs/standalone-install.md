# Standalone install: comparison matrix and recommendation

**Status: awaiting the owner's decision** (OT plan `4bec3d8e`, task 6 is the decision gate).
This document compares four ways to make `openthrottle-app` a standalone install and recommends one. Every number
below comes from one of the five spike reports in [`standalone-install/`](./standalone-install/). Each cell names
its source. Where a number was **not measured**, the cell says so rather than estimating.

| Spike                                      | Report                                                              |
| ------------------------------------------ | ------------------------------------------------------------------- |
| T1 — how T3 Code ships                     | [t3code-teardown.md](./standalone-install/t3code-teardown.md)       |
| T2 — `openthrottle-server` inside Electron | [server-in-electron.md](./standalone-install/server-in-electron.md) |
| T3 — Postgres: native vs PGlite            | [postgres-options.md](./standalone-install/postgres-options.md)     |
| T4 — Redis vs Valkey                       | [redis-options.md](./standalone-install/redis-options.md)           |
| T5 — Docker-managed baseline               | [docker-option.md](./standalone-install/docker-option.md)           |

"Today" means the thin-client build from plan `24f3510f`: `.app` 295 MB, zip 123 MB, arm64. Those two numbers were
measured when that plan shipped, not by these spikes.

## The options

1. **Thin client** (today): the app connects to an OpenThrottle server that someone else runs.
2. **All-in-one native**: the Electron main process supervises Postgres 18 (with pgvector and pg_trgm) and Valkey
   as native child processes. It runs `openthrottle-server` (with `PROCESS_ROLE=all`) and the developer server as
   utilityProcesses. Data lives in `userData`.
3. **All-in-one PGlite**: the same as option 2, but with PGlite over `pglite-socket` instead of native Postgres.
4. **Docker-managed**: the app drives `applications/openthrottle/docker-compose.yml` on the user's Docker Desktop.
5. **Hybrid**: a thin client by default, with an opt-in "Run a local server" choice on the connection screen
   that runs option 2.

## Matrix

Sizes are for darwin-arm64.

| Column                       | Thin client                                                                                           | All-in-one native                                                                                                                                                                                                                                                                  | All-in-one PGlite                                                                                           | Docker-managed                                                                                                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Download / installed**     | zip 123 MB, `.app` 295 MB (today)                                                                     | `.app` ≈ **421 MB** = today 295 + server whole-package +105 (T2) + PG trimmed 17.9 (T3) + valkey-server 3.3 (T4). Zip not measured; the compressed parts are PG 5.4 MB gz (T3) and Valkey 1.3 MB gz (T4), and the server closure's compressed size was not measured                | Same as native, minus PG 17.9, plus PGlite's own package (its size was not re-measured in T3)               | The app (thin client) plus a **~1.05 GB** compressed pull that unpacks to **~5.7 GB** of images and 0.67 GB of build cache (T5), plus Docker Desktop itself (not measured) |
| **Cold start**               | Not measured (depends on the remote server)                                                           | PG init + 161 migrations **3.0 s** (T3) + server ready **1.8 s** (T2) + Valkey 10–27 ms (T4). Run in sequence that is ≈ 4.8 s, but the parts were measured separately, never as one supervisor                                                                                     | PGlite init + migrations **1.9 s** (T3) + server 1.8 s (T2)                                                 | **118 s** to a healthy server, about 90 s of it download (T5)                                                                                                              |
| **Warm start**               | Not measured                                                                                          | PG **0.15 s** (T3) + server 1.8 s (T2)                                                                                                                                                                                                                                             | PGlite **0.16–0.22 s** (T3) + server 1.8 s                                                                  | API **14 s**, developer UI **20 s** (T5)                                                                                                                                   |
| **Idle memory**              | Electron shell, no window, ≈ 247 MB (browser 142 + GPU 62 + network 44) + developer child 198 MB (T2) | Thin-client figures + server **~300 MB** (T2) + PG **42 MB** (T3) + Valkey **9 MB** (T4)                                                                                                                                                                                           | PGlite **516–888 MB** instead of PG's 42 MB (T3)                                                            | The stack uses **~540–620 MiB** (T5), plus a Docker Desktop VM that reserves 15.6 GiB (its real usage was not isolated)                                                    |
| **Working memory**           | Not measured                                                                                          | Server peak **1.27 GB**, then 928 MB under a synthetic load (T2). A real plan run was not measured                                                                                                                                                                                 | Not measured beyond idle                                                                                    | Not measured                                                                                                                                                               |
| **What breaks offline**      | Everything: there is no server                                                                        | Nothing in the stack itself; agent CLIs and model APIs still need the network                                                                                                                                                                                                      | Same as native                                                                                              | First install and upgrades, which need image pulls (T5)                                                                                                                    |
| **Upgrades and migrations**  | The server operator handles them                                                                      | Ledgered migrations at boot (T1 pattern; T3 ran all 161). A Postgres major upgrade needs `pg_upgrade`, measured at **11–12 s** for 17→18 on a realistic DB, plus **~16 MB/arch** of the old major's binaries shipped in that release (T3)                                          | No major-version tooling. `COPY` wedges PGlite permanently, so dump/restore and backups are impossible (T3) | Bump `APP_VERSION`, pull, `up`. That needs tagged multi-arch images, which do not exist (T5)                                                                               |
| **Signing / notarization**   | The Electron app only (plan `333b0695`)                                                               | Plus **17** Postgres Mach-O files (T3), **1–2** Valkey (T4), `bcrypt.node` and `rg` (T2). All need one Developer ID: ad-hoc signing breaks dylib loading under hardened runtime (T3). Real notarization not tested                                                                 | Plus Valkey, bcrypt and rg; no Postgres binaries                                                            | The Electron app only                                                                                                                                                      |
| **Licensing**                | —                                                                                                     | Postgres (PostgreSQL License), pgvector (PostgreSQL License), Valkey (BSD-3-Clause) are all redistributable. Valkey's vendored deps include **BSL-1.0**, which is not in `license-policy.json` and needs a policy line (T4). Redis 7.4+/8.x is **excluded** by our own policy (T4) | Same as native, plus PGlite (Apache-2.0 or PostgreSQL License)                                              | Docker Desktop is free only below 250 employees and $10M revenue (T5)                                                                                                      |
| **Operational burden on us** | Lowest                                                                                                | High: a supervisor for four processes, per-arch Postgres + Valkey builds, Postgres major upgrades, a userData backup story, and support for a database that runs on every user's laptop                                                                                            | Native's burden plus a known-incorrect database at pool > 1                                                 | Medium: publish and maintain multi-arch images (not done today), plus Docker support tickets                                                                               |
| **Fit with T3 Code**         | T3 also connects to remote backends (SSH pool)                                                        | Matches T3's shape (desktop supervises a local server, data in the user's home), but T3 has no database server at all: SQLite + `node:sqlite` (T1)                                                                                                                                 | Closest to T3's embedded-database spirit, but not safe here                                                 | T3 does not do this                                                                                                                                                        |

## Findings that decide it

- **PGlite is out.** Over `pglite-socket` every connection shares one Postgres session. At pool size 2 it returned
  **4,128 wrong rows with no errors**, and through the real server one `plan(id)` request returned a different plan
  (T3). Running it single-connection needs code changes, halves throughput (262 vs 601 req/s), drops
  `statement_timeout`, and still wedges on `COPY`. That is the failure mode that matters most for a user's only
  copy of their data.
- **Docker is out as the default.** It has a two-minute first start, data in Docker's VM rather than with the
  app, commercial licensing limits, and today the published images cannot produce a working stack: postgres and
  mcp are not published, `latest` is stale, and login returns 500 (T5). It remains a sensible way for
  Docker-native users to self-host a server that a thin client connects to.
- **Redis cannot be dropped cheaply.** 16 queues, about 79 files importing BullMQ, 8 repeatables plus dynamic job
  schedulers (T4). Valkey is tiny (3.3 MB, 9 MB RSS) and BullMQ, Lua and Bull Board all passed against it, so
  bundling it is far cheaper than replacing it.
- **Native Postgres is small and fast.** It is 17.9 MB trimmed, starts warm in 0.15 s and idles at 42 MB. The real
  costs are signing 17 binaries and owning major-version upgrades (T3).
- **The server is the hard part, not the databases.** It boots inside Electron (T2), but the nft-traced closure
  that the developer build uses **does not boot**: source-first `.ts` workspace packages, nft's TypeScript and
  `exports` gaps, and runtime-resolved files (T2). Whole-package staging works at 124.5 MB for the server alone.
  Bundling the server with esbuild instead was not tried, and it is the first thing to try.

## Recommendation: the hybrid (option 5), with all-in-one native as the local mode

Keep the thin client as the default connection, as it is today. Add **"Run OpenThrottle on this Mac"** as an
opt-in on the connection screen, implemented as all-in-one native: Postgres 18 + pgvector + pg_trgm, Valkey 9 with
AOF `everysec` in `userData`, and one `openthrottle-server` utilityProcess with `PROCESS_ROLE=all`. Ship it in
the same `.app`.

**Testing the owner's lean honestly.** The lean towards all-in-one holds up for the databases. Native Postgres
and Valkey together add about 21 MB and about 50 MB idle, both measured, so they are not what makes this
expensive. The parts that cost money are:

1. making `openthrottle-server` packageable: +105 MB on the path that works, with a smaller bundle unproven;
2. Postgres major upgrades, forever;
3. 20+ binaries to sign and notarize;
4. owning a database on every user's laptop.

None of that is a reason not to do it. It is a reason to keep the thin client as the default and to treat local
mode as a product feature with its own rollout, not as "the" install.

The lean does **not** hold for PGlite. Its smaller footprint looks attractive, but it returns wrong data silently.

### What a build plan must cover (input to task 7)

1. Make the server packageable. Try an esbuild bundle of `openthrottle-server` first. Fall back to whole-package
   staging (159.7 MB combined). Remove the `nx` runtime dependency (20 MB for one `workspaceRoot` import) and the
   `import.meta.resolve('@tools/generators/package.json')` at import time.
2. Replace or disable the `pnpm` spawn in the database-backup job (T2). Backups in local mode should use a shipped
   `pg_dump`.
3. A supervisor in main, using T1's recipe: data-dir ownership lock, readiness polling, 500 ms→10 s restart
   backoff, SIGTERM→5 s→SIGKILL, and a per-launch token for the loopback port.
4. Per-install secrets (`JWT_SECRET`, the two `ot_sa_` service-account tokens, the Postgres password) in a 0600
   file in `userData`, until signing allows safeStorage (T2).
5. Postgres 18 + pgvector per-arch build and relocation (`install_name_tool`), and a pg_upgrade path that pins
   data checksums and keeps the socket path under 103 bytes (T3).
6. Valkey build and its `maxclients` headroom (the server opens 53 connections), plus the `REDIS_SOCKET_PATH`
   config option (T4).
7. Login-shell PATH discovery for agent CLIs and git (T1).
8. Reconcile with plan `333b0695` (signing, notarization, auto-update, per-arch release): every bundled binary
   lands there.

## Open risks

- **The server bundle size is unproven.** 105 MB is the measured working path. An esbuild bundle could be much
  smaller, or could hit the same `.ts`/runtime-resolution problems. This is the biggest unknown.
- **Running `.ts` from inside `app.asar` is untested** (T2). Source-first packages may force `asarUnpack` or a
  bundle.
- **Real notarization of Postgres + Valkey + native modules was not run**, only reasoned from hardened-runtime
  behaviour with ad-hoc signatures (T3).
- **Working memory during a real plan run was not measured.** The 1.27 GB peak came from a synthetic load (T2).
- **x86_64 was only built and run under Rosetta** (T3). Intel hardware was not tested.
- **The server exits when Redis restarts** (`@keyv/redis` client error unhandled). Filed as follow-up plan
  `ec065d7e`. This must be fixed before a supervised local Valkey can restart safely (T4).
- **BSL-1.0** in Valkey's vendored dependencies needs a `license-policy.json` decision (T4).
- **The published Docker images are broken for self-hosting** (T5). This is independent of this decision, but it
  affects anyone told to "just run the compose file".
