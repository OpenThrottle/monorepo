# Spike: openthrottle-server inside the Electron app (utilityProcess)

Date 2026-11-12. Worktree `loop-plan-standalone-install` at `bed9e36b2` (main `bfab39c7a` is an ancestor).
Electron 45.2.1 (Node 24.22.1, ABI 150, N-API 10), arm64 macOS. External Postgres `:6010` / Redis `:6011` (shared dev DB, ledger at `157_create_user_preferences.sql`, so it is current; no migrations were run).
All experiments ran in `scratchpad/task2/`. Tracked tree untouched (`git status --short` is empty). Nothing was committed and no OT status was changed.

## Verdicts

| Acceptance criterion                                    | Verdict                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server boots inside Electron and answers `serverHealth` | **PASS.** `utilityProcess.fork` of the staged `server/build/src/main.js`: `{"api":"ok","database":"ok","redis":"ok","websocket":"ok"}` 1.8 s after fork. The same answer comes back through the existing developer-server child's `/graphql` proxy. Role `all` and the api + worker split both pass. |
| bcrypt decision, with hash-compatibility evidence       | **Keep `bcrypt`. No rebuild, no switch.** bcrypt 6 ships N-API prebuilds, so it loads under Electron's ABI 150 as is. bcryptjs is a proven drop-in fallback: hashes verify in both directions, including the real seeded hash.                                                                       |
| pnpm spawn explained                                    | **Done.** One production call (database backup). A teardown call is gated to the monorepo. A packaged app has no pnpm, workspace or tsx, so backup must run in-process or be off.                                                                                                                    |
| Combined closure size, idle RSS and working RSS         | **Measured, with a caveat.** The closure that actually boots is 159.7 MB (whole packages). The 51.7 MB traced closure (the stage-app method) does **not** boot. Idle: 300 MB for the server and 198 MB for the developer child. Under read load the server peaks at about 1.27 GB.                   |

## Harness

- `harness/main.cjs` is an Electron main process. It calls `app.whenReady()` and then `utilityProcess.fork(stage/server/build/src/main.js, { env, stdio: 'pipe' })` for the role `all`, or one fork per role for `api` and `worker`. It polls `POST /graphql { serverHealth }`, then forks the real developer child `out/main/server.js` with the env that `buildServerEnv` produces (`API_URL_INTERNAL` = spike server), waits for `{ port }`, and probes `/__shell/health` and the proxied `serverHealth`. It samples `app.getAppMetrics()` and `ps -o rss` every 5 s.
- Env comes from parsing the worktree's `applications/openthrottle-server/.env` inside the harness. Values were never printed. Overrides isolate the spike from the primary checkout:
  - `PORT=7311/7313`, `NODE_ENV=production`
  - `OT_QUEUE_PREFIX=bull:spike-electron`: the spike's workers never see the primary's jobs.
  - `OT_SCHEDULED_JOBS_OWNER=false`, `OT_WORKTREE_DB=shared`, `OT_BACKUP_OWNER=false`, `DATABASE_BACKUP_ENABLED=false`: no boot reconciles of plans, runs or schedules against the shared DB, and no repeatables.
  - The spike's Redis keys were deleted afterwards (0 left).
- Run it with `scratchpad/task2/run.sh <all|split> <port> <outdir>`. Results are in `run-all/result.json` and `run-split/result.json`, with per-child logs next to them.
- The Electron binary was fetched from the local cache with `pnpm exec install-electron` in `applications/openthrottle-app`. Builds were `pnpm nx run openthrottle-server:build`, then `pnpm nx run openthrottle-app:build`, run one after the other.

## 1. bcrypt

- **Load test** (`bcrypt/probe.cjs`, `bcrypt/compat.cjs`):
  - `node probe.cjs <bcrypt>` gives `{"modules":"137","ok":true}`.
  - `ELECTRON_RUN_AS_NODE=1 Electron probe.cjs <bcrypt>` gives `{"node":"24.22.1","modules":"150","electron":"45.2.1","ok":true,"prefix":"$2b$10$"}`.
- **Why it works:** bcrypt 6.0.0 uses `node-gyp-build` with `prebuilds/<platform>/bcrypt.node` built by `prebuildify --napi`. N-API is ABI-stable across Node and Electron, so the expected ABI mismatch does not happen. The repo also has `allowBuilds: bcrypt: false` in `pnpm-workspace.yaml`, so nothing is ever compiled. The prebuild is what runs today.
- **Inside the utilityProcess:** `users.service` and `service-accounts.service` import bcrypt at module load, so the server booting proves the addon loaded. The authenticated `plans(limit: 5)` query returned 200 with 5 rows. It used the `ot_sa_…` service-account token, and `GlobalAuthGuard` checks that token with `bcrypt.compare`, so a native compare actually ran inside the utilityProcess.
- **`@electron/rebuild`:** not needed, and not run. It would rebuild from `binding.gyp` with Electron headers, which needs Xcode and a header download, to produce an ABI-specific binary that is no better than the N-API prebuild. It would only matter for a non-N-API addon.
- **Hash compatibility** (bcryptjs 3.0.3 vs bcrypt 6.0.0, under both Node 24.15 and Electron's Node):
  - rounds 10 and 12, `$2b$` prefix, 60 characters: bcryptjs verifies the native hash (`true`), bcrypt verifies the bcryptjs hash (`true`), and a wrong password is rejected by both.
  - Async API: `bcrypt.compare(bcryptjs.hash(...))` and the reverse are both `true`.
  - Input over 72 bytes: both truncate at 72 identically.
  - **Real seeded hash** (`users.password_hash` for `developer@openthrottle.ai`, read with `docker exec … psql`): `$2b$10$`, 60 characters. `bcrypt.compareSync(seedPw)` is `true` and `bcryptjs.compareSync(seedPw)` is `true`. The seed password is the default in `scripts/bootstrap-default-user.ts`. The hash was kept in a 0600 scratch file and deleted afterwards.
  - Speed at round 10: native 414 to 446 ms and js 432 to 434 ms per hash. The host was heavily loaded (loadavg 8 to 31), so treat this as parity, not as absolute numbers.
- **Decision:** keep `bcrypt`. Packaging cost: `node_modules/bcrypt/prebuilds/darwin-arm64/bcrypt.node` is the closure's first native file. It must go in `asarUnpack` and in `EXPECTED_NATIVE_FILES`, and only the target platform's prebuild should be shipped (nft traced only darwin-arm64). Switching to bcryptjs would be a zero-migration fallback if `asarUnpack` ever becomes a problem. Its API is identical for `hash`, `compare` and `hashSync`, but it would need a code change in `nestjs-repositories`.

## 2. The `spawn('pnpm', …)` calls

- **Production path:** `applications/openthrottle-server/src/queues/database-backup/database-backup.utils.ts:212` runs `spawn('pnpm', ['-w', 'run', 'database:backup'], { cwd: WORKSPACE_ROOT ?? process.cwd() })`.
  - It is the BullMQ "Database Backup" repeatable job, gated by `DATABASE_BACKUP_ENABLED`, `DATABASE_BACKUP_CRON` and backup ownership.
  - The root script is `tsx --env-file .env ./scripts/openthrottle-database-backup.ts`. That script runs `pg_dump` through `docker exec` on the compose postgres container, or falls back to the host `pg_dump`.
- **Second call:** `services/plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts:370` runs `pnpm run worktree:serve --stop` inside a plan-run worktree. It runs only when that worktree's `package.json` defines the script, so it is a monorepo-only courtesy and is skipped for any other repo. It is harmless in a packaged app if pnpm is missing: the result is non-zero, and the code logs a warning and continues.
- **What a packaged app does instead:** there is no pnpm, no workspace root, no `scripts/`, no tsx and no `.env`, so the backup spawn would fail with ENOENT.
  - Option A: run with `DATABASE_BACKUP_ENABLED=false` for now (what the spike did).
  - Option B: move the backup logic into an importable module and call it in-process from the worker. That still needs a `pg_dump` binary. With an embedded Postgres it would be shipped next to Postgres; with an external DB it means the host `pg_dump` or a docker one.
- Not pnpm, but related: `@tools/generators` (repo tooling) is resolved at import time through `import.meta.resolve` in `src/modules/generators/generators.utils.ts`, so it must be staged or made lazy (see §5).

## 3. Process roles and RSS

`PROCESS_ROLE` decides which modules load (`api`, `worker` or `all`; unset means `all`). `main.ts` runs `createApplicationContext(WorkerAppModule)` for `worker`, and `NestFactory.create(...)` with the HTTP listener otherwise.

| Run                    | Child            | Idle RSS (60 s, after a 15 s settle)               | Under load (peak / end)              |
| ---------------------- | ---------------- | -------------------------------------------------- | ------------------------------------ |
| `all` (one child)      | ot-server-all    | 391 MB at the first sample, then **298 to 300 MB** | **1,269 MB peak**, 928 MB after load |
|                        | developer-server | 301 MB, then **198 MB**                            | 198 MB                               |
| `split` (two children) | ot-server-api    | 388, then **295 MB**                               | 826 to 838 MB                        |
|                        | ot-server-worker | 380, then **284 to 285 MB**                        | 284 to 285 MB (unchanged)            |
|                        | developer-server | 198 MB                                             | 198 MB                               |

Other processes: Electron browser 141 MB, GPU 62 MB, network service 43 MB. These are the harness's own; there was no window. `ps` RSS and `getAppMetrics().workingSetSize` agree within 2 MB.

- **Load, stated exactly:**
  1. 3 `agentic-test` BullMQ jobs on the spike's own prefix. Each echoes 3 timestamps over about 3 s and touches no DB. All completed: by the `all` child, or by the worker child in the split run.
  2. 8 concurrent loops for 60 s of `{ plans(limit: 200) { id title status taskCount tasksCompletedCount runnableTaskCount description tags{id} projectRelation{id} } }` with the service-account token. Results: 999 OK and 2,158 or 2,210 rejected with `ThrottlerException: Too Many Requests`, from the server's own throttler, not from overload.
- **Not a plan run.** A real plan run would mutate plan status in the shared DB and spawn an agent CLI, which is outside this task's rules. The worker's RSS under real Ralph or OT-loop work is therefore **not measured**. The worker child stayed flat because the test jobs are trivial.
- **Answer:** one child can run both API and workers (`all` booted, served, processed jobs and answered health). Local mode does not need two children. Splitting costs about +285 MB idle, about 2 × 300 MB versus 300 MB. Its only benefit is that API restarts do not kill in-flight jobs (the reason given in `main.ts`), and that matters less in a desktop app.
- **Recommendation:** use one `all` child plus the developer child, about 500 MB idle in total. Keep the split as a later option behind the same supervisor.
- **Ownership:** in the shipped single-user mode the child must be the repeatables owner (`OT_SCHEDULED_JOBS_OWNER=true`, or unset in a non-worktree install). The spike turned this off only because it shared the primary's DB.

## 4. Secrets and env

- **The minimal env that boots** was found by elimination in `harness/quick.cjs`, under `ELECTRON_RUN_AS_NODE`, with only these keys:
  - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `REDIS_PORT`, a freshly generated `JWT_SECRET`, `API_URL_INTERNAL`, plus the overrides `POSTGRES_HOST`, `REDIS_HOST`, `PORT`, `NODE_ENV`, `PROCESS_ROLE` and the `OT_*` ownership keys.
  - Result: `Application is running … (PROCESS_ROLE=all)`. The only warning was that tagging is disabled with no `ANTHROPIC_API_KEY`.
  - Without `API_URL_INTERNAL` it dies with an uncaught `API_URL_INTERNAL is not set` from `nodejs-graphql`'s `getGraphQLUrl`.
  - `POSTGRES_VERSION` and `POSTGRES_PATH_MIGRATIONS` (marked `Joi.required()`) were not needed in practice.
- **Must be generated per install:**
  - `JWT_SECRET`: at least 32 bytes, enforced by `JwtStrategy`, random.
  - `OPENTHROTTLE_WORKER_GRAPHQL_AUTH_TOKEN` and `OPENTHROTTLE_MCP_AUTH_TOKEN`: `ot_sa_…` service-account tokens, minted against the install's DB as `scripts/bootstrap-service-account-credentials.ts` does today. The worker needs them for plan runs; boot does not.
  - The Postgres password, when Postgres is bundled.
  - `BULLMQ_BOARD_ADMIN_*` only if Bull Board is ever enabled. It is off in production.
- **Config only, not secret:** `API_URL_INTERNAL` (derived from the bound port), `CORS_ORIGINS` (irrelevant, because the developer child proxies same-origin), `NODE_ENV=production`, `DATABASE_BACKUP_ENABLED=false`, and `WORKSPACE_ROOT` (the default checkout).
- **User-provided and optional:** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` and `XAI_API_KEY` (tagging and embeddings), `STRIPE_*` (not needed locally), `ROLLBAR_TOKEN`.
- **Where they live:**
  - Until signing: a 0600 `secrets.json` in `app.getPath('userData')`, generated on first run beside the existing `settings.json` and written with the same temp-then-rename store. Main reads it and passes the values only through `utilityProcess.fork({ env })`, never to the renderer.
  - After signing (a separate plan): wrap the file with `safeStorage` (Keychain-backed).
  - The server's `load-env.ts` reads `build/../.env`. The stage has no `.env`, and the invariant that no `.env` ships still holds, so env injection by main is the only channel.

## 5. Closure size (measured)

Staging script: `scratchpad/task2/stage-closure.mts`. It uses the same `@vercel/nft` trace and the same `planStageFiles` flat placement, imported from `applications/openthrottle-app/scripts/utils/`, plus a shim that maps `packages/*` workspace packages onto synthetic store paths, because the planner only knows `.pnpm` paths. Sizes are apparent bytes of `node_modules`, `.map` files excluded.

| Closure                      | Traced (stage-app method)                                                 | Whole packages (boots)                                                   |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Developer only (today's app) | 26.8 MB, 3,079 files, 153 packages (du 36.6 MB, matching the doc's 36 MB) | 54.8 MB                                                                  |
| Server only                  | 41.0 MB, 6,407 files, 401 packages                                        | 124.5 MB (+4.5 MB ripgrep platform package, +1.9 MB `@tools/generators`) |
| **Combined, deduplicated**   | **51.7 MB, 8,992 files, 473 packages**                                    | **159.7 MB, 25,668 files**                                               |
| Shared between the two       | 16.1 MB                                                                   | 19.6 MB                                                                  |

Add the server's own `build/` at 2.1 MB without maps and `.d.ts`, and the developer build at 11.5 MB.

**The traced closure does not boot.** Four tracer gaps, each reproduced:

1. **14 source-first workspace packages run as `.ts` under Node type stripping**: `agentic-hooks`, `openthrottle-agentic-utils`, `-loop`, `-ralph`, `-drivers`, `-skills` and others. Node refuses to strip under `node_modules` (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`). The spike placed them in `ws/@openthrottle/*` with `node_modules` symlinks so the realpath is outside `node_modules`. Running `.ts` from inside `app.asar` is **untested**. A real build should emit JS for these, or bundle the server.
2. **nft does not parse TypeScript**, so it misses those packages' own `.ts` files and their third-party imports (`yaml`, `nx`, `chokidar`, …). The spike fixed this by copying their `src` and adding the resolved import specifiers as extra trace entries.
3. **Nested `exports` conditions are mis-resolved.** For example, CommonJS `require('lru-cache')` needs `dist/commonjs/node/index.min.js`, which nft never emitted. Patching export leaves only moved the failure (`@graphql-tools/schema/esm/...`). Copying **whole packages** at the planned placement is what made it boot.
4. **Runtime lookups nft cannot see:**
   - `import.meta.resolve('@tools/generators/package.json')`, called at import.
   - `@vscode/ripgrep` 1.18 now requires the `@vscode/ripgrep-darwin-arm64` optional package. That is a native `rg` binary, another `asarUnpack` entry. `data.stage.ts` still assumes a postinstall.

Bloat this exposes, from the whole-package top list:

- `js-tiktoken` 22.4 MB (LangChain)
- `nx` 20.4 MB, pulled in only for `nx/src/utils/workspace-root` in `openthrottle-agentic-utils/src/utils/nodejs.ts`
- `@ts-morph/common` 12.2 MB
- `date-fns` 9.5 MB, `react-dom` 7.3 MB, `typeorm` 5.9 MB

Native or executable files that need `asarUnpack`: `bcrypt.node` and `rg`.

**Size verdict:** the combined uncompressed `node_modules` is about 52 MB at the lower bound (traced, broken) and 160 MB as measured working (whole packages). The server adds about 105 MB to today's app on the working path. Precise tracing or a bundler pass over the server should bring the working figure close to the traced figure; that was not done here.

## What was not measured or done

- RSS during a real plan run (worker plus agent CLI). Only trivial jobs and throttled read load were measured.
- A packaged `.app` or asar build. The boot used the staged folder; ESM and `.ts` from asar are not tested for the server.
- An Intel or Linux build. Only the darwin-arm64 prebuild and `rg` were traced.
- `@electron/rebuild` was not executed (unnecessary, see §1).
- A login through the UI. The developer child's `/login` returned 404, so the route name probably differs. The developer child itself was healthy (shell `ok`, proxied `serverHealth` `ok`).
- Bundling the server (esbuild) as an alternative to tracing. This is the obvious follow-up.
