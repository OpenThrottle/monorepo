# Spike: Postgres for a standalone install — native embedded vs PGlite

Date 2026-11-12, arm64 macOS (10 cores, load average 8–16 throughout, so treat timings as relative). Worktree `loop-plan-standalone-install` at `cbfd3f87b`, tracked tree untouched. Everything ran under `scratchpad/task3/`. No migration, write or schema change touched `:6010`; its only use was two read-only `pg_dump`s. Production runs `pgvector/pgvector:0.8.2-pg18` (`applications/openthrottle/Dockerfile.Postgres`), so the native candidate is PG 18 + pgvector 0.8.2.

## Verdict

**Ship native Postgres 18 (trimmed, self-built, pgvector built from source), not PGlite.** PGlite runs all 161 migrations, pgvector (HNSW) and pg_trgm correctly, but `pglite-socket` multiplexes every TCP client onto **one** Postgres session. Under openthrottle-server's TypeORM pool (10) it returns **wrong rows silently** and fails ~15% of GraphQL requests with protocol errors. It is only correct with exactly one connection in the whole system, which needs a code change (the main pool ignores `POSTGRES_POOL_MAX`), forbids a separate worker process, ignores `statement_timeout`, leaks `SET` state between connections and breaks `COPY` (so `pg_dump`/`pg_restore` backups wedge it). Its idle RSS is 0.5–0.9 GB against about 42 MB for native. Native costs one ~70 s source build per arch, 17 Mach-O files to sign and a `pg_upgrade` story, and all three are measured below and work.

## Migrations: the count today

- `databases/openthrottle/migrations/` holds **161 `.sql` files** (highest prefix `157_`; duplicate prefixes `084 085 087 090 092 110 111`). `databases/cms/migrations/` holds 10. The "156" in the task is stale.
- `pnpm run database:migrate` → `scripts/openthrottle-database-migrations.ts` (tsx + workspace guard) → `databases/migration-runner.ts` (`runMigrations` + `PgMigrationStore`, one transaction per file, `schema_migrations` ledger). The container entrypoint `databases/migrate.ts` runs the same runner. I drove that runner directly: `scratchpad/task3/pglite/migrate-one.mts` imports `migration-runner.ts` and runs only the openthrottle ledger. One run also used `databases/migrate.ts` as is.
- **CMS is not needed at boot.** No server or `nestjs-*` source references `CMS_POSTGRES_*`; only `openthrottle-agentic-utils/src/utils/postgres.ts` does. The `nestjs-repositories-cms` module is not booted by the server (see the CMS wiring plan).
- **Result: 161/161 on native PG 18.7 and 161/161 on PGlite 0.5.16 (PG 18.6).** Extensions after migrating: native `vector 0.8.2`, `pg_trgm 1.6`; PGlite `vector 0.8.7` (bundled; it cannot be pinned to prod's 0.8.2), `pg_trgm 1.6`.
- **PGlite gotcha:** `databases/migrate.ts` reported `Created database cms` and applied the 10 CMS files, but `pglite-socket` ignores the startup database name (`psql -d cms` → `current_database() = postgres`). The CMS tables landed in the openthrottle DB under the same ledger (171 rows), and any colliding `CREATE TABLE IF NOT EXISTS` (for example `tags`) was silently skipped. A PGlite install needs one PGlite instance per database.

## (a) Native: trimmed PG 18.7 + pgvector 0.8.2

**Build** (sources from ftp.postgresql.org, sha256 verified; pgvector `v0.8.2` tag tarball):

```
./configure --prefix=$S/pg18 --without-icu --without-readline --without-openssl --without-lz4 --without-zstd \
  --without-perl --without-python --without-tcl --without-llvm
make -j8 world-bin && make install-world-bin            # 69 s wall (configure+build+install, contrib incl. pg_trgm)
cd pgvector-0.8.2 && make PG_CONFIG=$S/pg18/bin/pg_config OPTFLAGS='' install   # 3.1 s
```

- `OPTFLAGS=''` drops pgvector's `-march=native`, which a redistributable build must not use. pgvector is obtained by building it from source against the shipped server's `pg_config`, in seconds. No Homebrew is involved: Homebrew bottles link `/opt/homebrew` ICU, OpenSSL, krb5 and lz4, which would all have to be vendored. The machine has only `libpq 17.2` and a stale `postgresql@15` cellar.
- With these flags `postgres` links only `/usr/lib/libz` and `libSystem`. The client tools link `libpq.5.dylib` by its **absolute build path**, which I rewrote with `install_name_tool -change … @loader_path/../lib/libpq.5.dylib` (and `-id @rpath/libpq.5.dylib`). The tree then runs from any directory: it was proven by copying it to `reloc/pg` and running initdb, start, migrate and restore from there.
- **x86_64:** the same configure with `CC='clang -arch x86_64' --host=x86_64-apple-darwin` built in 88.5 s on arm64 (configure tests run under Rosetta). `lipo -create` per Mach-O gives a universal tree. The x86_64 slice was verified under `arch -x86_64`: initdb, start, and `CREATE EXTENSION vector, pg_trgm` all work.

**Trimmed set** (`pg18-trim/`): `bin/{postgres,initdb,pg_ctl,pg_dump,pg_restore,pg_upgrade,psql,pg_isready}`, `lib/libpq.5.dylib`, `lib/postgresql/{plpgsql,dict_snowball,vector,pg_trgm}.dylib`, and `share/postgresql/{*.bki,*.sql,*.sample,sql_features.txt,errcodes.txt,timezone/,timezonesets/,tsearch_data/,extension/{plpgsql,vector,pg_trgm}*}`. That is enough for initdb plus all 161 migrations.

| Artifact                               | On disk                                                         | tar.gz      | Mach-O files |
| -------------------------------------- | --------------------------------------------------------------- | ----------- | ------------ |
| Full `make install-world-bin` (arm64)  | 36 MB                                                           | –           | ~120         |
| **Trimmed arm64**                      | **17 MB** (bin 11, lib 1.7, share 4.1; `postgres` alone 9.5 MB) | **5.4 MB**  | **13**       |
| **Trimmed universal** (arm64 + x86_64) | **30 MB** (bin 23, lib 3.4)                                     | **10.9 MB** | **13** (fat) |

**Signing / notarization** (13 files: 8 executables, `libpq.5.dylib` and 4 loadable bundles; 17 once the pg_upgrade tools are added; counted with `file` over the tree):

- Every file must be signed with the Developer ID, `--options runtime --timestamp`, inside-out, before the app is signed. Ad-hoc signing (`codesign -s -`) works as long as the hardened runtime is off.
- **Measured trap:** with `--options runtime` and an ad-hoc signature, `psql` fails to load `libpq` with `mapping process and mapped file (non-platform) have different Team IDs`, and `initdb` aborts (rc 134). Library validation also covers `dlopen` of `vector.dylib` / `pg_trgm.dylib`. Signing everything with the **same Team ID** satisfies it. Re-signing the executables with `com.apple.security.cs.disable-library-validation` (`scratchpad/task3/dlv.plist`) made hardened ad-hoc binaries pass initdb, start, `CREATE EXTENSION vector, pg_trgm` and the vector/trigram queries. That proves the dlopen path, but it should not be needed with a real Team ID.
- No `allow-jit` entitlement is needed (`--without-llvm`). After `install_name_tool`, every file must be re-signed, because the edit invalidates the signature. Put the tree under `Contents/Resources` or `Contents/Helpers`, never in `asar`.

**Lifecycle from a parent process:**

- `initdb -D <dir> -U postgres --auth=trust -E UTF8 --locale=C`, then `pg_ctl -D <dir> -o "-p <port> -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -l <log> -w start`, then `pg_ctl -m fast -w stop`.
- **Gotcha, measured:** the first start failed with `Unix-domain socket path … is too long (maximum 103 bytes)` and `FATAL: could not create any Unix-domain sockets`. A long data or socket directory (an Electron `userData` path can be long) kills startup. Disable unix sockets (as above) or point `-k` at a short directory.
- For a desktop app, use a random password with `scram-sha-256` rather than `trust`, a random port, and a supervisor that watches `postmaster.pid`.

**Major-version upgrade:**

- The data dir is major-specific, so either ship the previous major's `bin` + `lib` (+17 MB per arch) next to the new one and run `pg_upgrade`, or `pg_dump` with the old server before swapping. Measured PG 17.12 → 18.7 below (§ Upgrade).
- Dump/restore of the realistic DB: `pg_restore` of the 79 MB custom dump into an empty PG 18 took **5.7 s**.

## (b) PGlite 0.5.16 + @electric-sql/pglite-socket 0.2.19

- Installed in `scratchpad/task3/pglite/` (npm): `@electric-sql/pglite` 26 MB, `pglite-pgvector` 96 KB, `pglite-socket` 424 KB. **0 Mach-O files** (wasm + data), so nothing extra to sign.
- Runs PG **18.6** compiled to wasm32. Server script: `pglite/serve.mjs <dataDir> <port> <maxConnections>` with `extensions: { pg_trgm, vector }`.

**Concurrency — exact behaviour** (`pglite-socket` source: one `QueryQueueManager` per server serialises protocol messages from all sockets into **one** backend session; `maxConnections` defaults to 1; transaction affinity uses `db.isInTransaction()`):

| Test                                                                                                                                                                                                             | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DB bench `bench.mjs` (6 reads, 2 vector kNN, 2 tx writes on an API pool; 2 `FOR UPDATE SKIP LOCKED` workers on a worker pool), API pool 10 + worker pool 5, 20 s                                                 | **72,353 wrong results** (a row for a different id), `invalid input syntax for type uuid: "[-0.0087…"` ×11,727 (the vector was bound into the uuid statement, and vice versa), `portal "" does not exist`, `unnamed prepared statement does not exist`, `Query read timeout` ×6. Without a pool `error` handler the first run crashed (`error: portal "" does not exist` from `idleListener`).                                                                                                             |
| Same, API pool 2 + worker pool 1                                                                                                                                                                                 | 0 errors but **4,128 silent mismatches**; reproduced on rerun (1,022 in 6 s)                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Same, pool 1 + 1                                                                                                                                                                                                 | clean, 315 ops/s, read p50 63 ms                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Reads only, tx only, vector only, or workers only, on pool 2; 2–3 separate single-connection processes, including tx vs reads and vector vs reads                                                                | clean. Corruption needs **mixed** concurrent transactional and non-transactional traffic, which is what TypeORM `save()` plus BullMQ workers produce.                                                                                                                                                                                                                                                                                                                                                      |
| **openthrottle-server** (built, `PROCESS_ROLE=all`, default TypeORM pool 10) + 900 GraphQL requests, 8 concurrent (plan(id) / plans(limit:50) / createNote)                                                      | **133/900 `Internal server error`**: `08P01 bind message supplies 2 parameters, but prepared statement "" requires 1` (also 50 vs 1), `34000 portal "" does not exist`. **1 `plan(id)` returned another plan.**                                                                                                                                                                                                                                                                                            |
| Server with every pg Pool forced to `max: 1` (preload `pglite/force-pool1.cjs`; `POSTGRES_POOL_MAX=1` alone did **not** work, because the `nestjs-repositories` DataSource sets no `extra.max`, so it stayed 10) | 900/900 OK, 0 mismatches, **262 req/s** (p50 27 ms, p99 78 ms). Plus a concurrent 2nd-connection "worker" (`worker-sim.mjs`): 800/800 OK, 217 req/s. No deadlock seen.                                                                                                                                                                                                                                                                                                                                     |
| Session leaks                                                                                                                                                                                                    | After a `pg_restore` connection closed, the next connection had `search_path=''` (`relation "plans" does not exist`). `SET work_mem='77MB'` on one connection was visible on the next. `PGOPTIONS=-c statement_timeout=1234` → PGlite `0` (native `1234ms`), so TypeORM's `statement_timeout` is silently dropped.                                                                                                                                                                                         |
| COPY                                                                                                                                                                                                             | `pg_restore` (custom format, COPY): `PQputCopyData: server closed the connection unexpectedly`. Even `\copy` of 1,000 rows gave `ERROR: unexpected EOF on client connection with an open transaction`, `FATAL: terminating connection because protocol synchronization was lost`, and then the **server wedged**: every later query timed out with `activeConnections 1, queuedQueries 1` and a 0 % CPU process. The realistic restore had to use `pg_dump --rows-per-insert=100` replayed through `psql`. |

**Concurrency verdict:** PGlite under TypeORM + workers is **unsafe** at any pool size above 1, and it fails silently. It is correct only as a single session: one process, every pool at `max: 1`, no separate worker process. Throughput is then roughly 40% of native, with no statement timeouts and no COPY-based backups. An in-process PGlite driver for TypeORM, instead of the socket, would remove the socket bugs but not the single-session limit. It is untested here and is not a supported TypeORM driver.

## Realistic database

I restored a **read-only `pg_dump` of the shared DB** (PG 18.4 on `:6010`): 1,195 plans, 6,811 tasks, 29,062 token-usage rows, and 1536-dim embeddings (5,760 code, 951 task, 568 plan, 170 doc) with HNSW and GIN trigram indexes.

- Native: `pg_restore` of the 79 MB custom dump.
- PGlite: the 269 MB plain `--rows-per-insert` dump.
- Both reported one ignorable error: `extension "uuid-ossp" is not available`. It exists on the shared DB but no migration creates it and nothing uses it.
- Dumps were 0600 and are deleted after use.

Row counts matched on both. Queries are in `scratchpad/task3/queries.sql`; to prove index use they ran with `enable_seqscan=off` after `ANALYZE`, because the planner seq-scans 5,760 rows:

| Query                                                                        | Native                  | PGlite         |
| ---------------------------------------------------------------------------- | ----------------------- | -------------- |
| kNN `ORDER BY embedding <=> $v LIMIT 10` (HNSW `idx_code_embeddings_vector`) | 1.8 ms (seq scan 19 ms) | 11.5 ms        |
| `title % 'worktree teardown'` (threshold 0.2, GIN `idx_plans_title_trgm`)    | 8 hits, 2.8 ms          | 8 hits, 7.4 ms |

Results were identical (nearest 0.0000, 10th 0.4362).

## Comparison (all measured; wall-clock; loaded host)

| Metric                                           | Native PG 18.7                                                | PGlite 0.5.16                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Shipped payload                                  | 17 MB arm64 / 30 MB universal (5.4 / 10.9 MB gz)              | 26.5 MB npm (platform-neutral)                                                |
| Files needing signing                            | 17 Mach-O (13 + 4 for pg_upgrade)                             | 0                                                                             |
| Cold start, empty: init + start + 161 migrations | initdb 1.98 s + start 0.15 s + migrate 0.91 s = **3.0 s**     | open+initdb 1.04 s + migrate 0.73 s = **1.9 s** wall                          |
| Warm start, migrated empty DB                    | **0.15 s** (`pg_ctl -w start`; stop 0.14 s)                   | **0.16 s** open (0.31 s wall incl. node)                                      |
| Warm start, realistic DB                         | 0.15 s (stop 0.14 s)                                          | 0.17–0.22 s open (0.26–0.36 s wall); stop 0.16 s                              |
| On disk, empty migrated                          | 44.7 MB (base 27.7 + WAL 16)                                  | 44.3 MB (base 27.3 + WAL 16)                                                  |
| On disk, realistic                               | 469 MB (base 260 + WAL 208; `pg_database_size` 235 MB)        | 437 MB (base 260 + WAL 176; 233 MB)                                           |
| Restore realistic dump                           | 5.7 s (`pg_restore`, COPY)                                    | 30.9 s (INSERT replay; COPY breaks it)                                        |
| Idle RSS, DB process(es)                         | postmaster 18 MB; 9 procs 42 MB total                         | 516–556 MB (migrated empty); **888 MB** (realistic, idle after open)          |
| RSS under load                                   | 19 procs, 444 MB summed (`ps` double-counts `shared_buffers`) | 893–1,112 MB peak                                                             |
| DB bench ops/s (pool 10 + 5)                     | **35,281**, 0 errors, read p50 0.2 ms / p99 0.7 ms            | 4,208, **corrupt** (see above)                                                |
| DB bench ops/s, pool 1 + 1                       | –                                                             | 315, clean, read p50 63 ms                                                    |
| Server boot to `serverHealth` ok                 | 3.6 s                                                         | 2.3 s                                                                         |
| GraphQL 900 req, 8 concurrent                    | **601 req/s**, 0 errors, p50 13 / p99 27 ms                   | pool 10: 455 req/s, **133 errors + 1 wrong row**; pool 1: 262 req/s, 0 errors |
| openthrottle-server RSS under that load          | 530 MB                                                        | 585–592 MB                                                                    |
| `statement_timeout`, COPY, multi-DB              | yes                                                           | no / no (wedges) / no (one DB per instance)                                   |
| Major upgrade                                    | `pg_upgrade` (see below) or dump/restore                      | PGlite release-bound; dump/restore only                                       |

The server's own throttler (1,000 req/min, not configurable by env) caps GraphQL runs at about 900 requests. One run hit `ThrottlerException`, was discarded and was rerun after 60 s.

## Upgrade (native, PG 17.12 → 18.7)

- **Setup:** PG 17.12, same trimmed configure plus pgvector 0.8.2 (built in about 75 s). `migrate-one.mts` ran **161/161 on PG 17 too** (1.4 s). The realistic dump was restored into PG 17 with PG 18's `pg_restore`; the only error was uuid-ossp.
- **Command:**
  ```
  pg_upgrade -b pg17/bin -B pg18/bin -d up17 -D up18 -U postgres --link|--copy --socketdir=<short dir>
  ```
- **Result:** `--copy` **11.3 s**, `--link` **12.1 s** for the 464 MB cluster; schema dump and restore dominate, so `--link` saves no time at this size. The upgraded cluster has 1,195 plans, a 171-row ledger, `vector 0.8.2`, `pg_trgm 1.6`, the same kNN result through HNSW, and the same 8 trigram hits.
- **Traps hit, all measured:**
  1. `pg_upgrade` needs `pg_controldata`, `pg_resetwal`, `pg_dumpall` and `vacuumdb` in the new bindir (`check for …/pg_controldata failed`). They are now in the trimmed set: **+4 files, +0.6 MB → 17 Mach-O, 17.9 MB arm64**. The universal figures above are for the 13-file set.
  2. PG 18 `initdb` enables data checksums by default and PG 17 does not (`old cluster does not use data checksums but the new one does`). Always pass an explicit `--data-checksums` / `--no-data-checksums` so every future major matches.
  3. pg_upgrade's temporary servers use unix sockets in the cwd, which hits the 103-byte limit again. Pass `--socketdir` with a short path (I used a `mktemp -d` under `$TMPDIR`, removed afterwards).
- **Payload for an upgrade release:** the old major's `postgres`, `pg_ctl`, `pg_controldata`, `pg_resetwal` and friends plus `lib` + `share` is about **16 MB per arch** (PG 17 measured: bin+lib 12.3 MB, share 4.1 MB), all signed too. It can be shipped only in the one release that upgrades, behind a "migrate data" step.
- **Dump/restore alternative:** start the old server, run `pg_dump -Fc`, then `pg_restore` into the new one (restore 5.7 s here). It needs the same old binaries, so it is no cheaper to ship.

## Server harness (how the server was pointed at a candidate)

- `pglite/launch.mjs <dbPort> <httpPort> <role> <poolMax> <log>` runs `node applications/openthrottle-server/build/src/main.js`, the existing build output. It is never `nest start` and never `:dev`.
- Env: `POSTGRES_HOST/PORT/DB/USER/PASSWORD` plus `POSTGRES_URL` / `OPENTHROTTLE_POSTGRES_URL` / `CMS_POSTGRES_URL`, all set to the candidate. These are set explicitly because `load-env.ts` fills unset keys from the worktree `.env` and `nestjs-repositories` connects via `getPostgresUrl()`.
- Also set: `REDIS_HOST=localhost REDIS_PORT=6011`, a fresh 48-byte `JWT_SECRET`, `API_URL_INTERNAL`, `PORT=7441/7442`, `OT_QUEUE_PREFIX=bull:spike-task3`, `OT_SCHEDULED_JOBS_OWNER=false`, `OT_BACKUP_OWNER=false`, `DATABASE_BACKUP_ENABLED=false`, `OT_WORKTREE_DB=shared`, `POSTGRES_PROFILING=false`, and empty `ANTHROPIC/OPENAI/XAI_API_KEY`, so there are no outbound model calls.
- The spike's 10 Redis `bull:spike-task3:*` keys were deleted afterwards (0 left).
- Load: `pglite/gql-load.mjs` logs in as the seeded developer user, with the test credentials read from `scripts/bootstrap-default-user.ts` and never printed.
- DB load: `pglite/bench.mjs`, `pglite/worker-sim.mjs`, `pglite/inproc.mjs`.

## Not measured / caveats

- No real BullMQ DB-touching job was run (scheduled owner off, so restored scheduled plans could not spawn agent CLIs). The worker was emulated by a second pool and a second process.
- The native RSS sum double-counts shared memory. Use a proper footprint tool if the number matters.
- PGlite's in-process (no socket) TypeORM path, notarization with a real Developer ID, and Intel hardware (only Rosetta) were not tested.
