# Spike: Redis options for a bundled install

Date 2026-11-12. Worktree `loop-plan-standalone-install` at `cd7853819`. The tracked tree was left untouched (`git status --short` is empty afterwards). The server was the existing build `applications/openthrottle-server/build/src/main.js`, run with plain `node`; no `nest start`, no `:dev`. It was pointed at the shared dev Postgres `:6010` (normal boot, no migrations) and at the spike's Valkey on `127.0.0.1:7461`, with HTTP on `:7462`. Ports 6011, 6020 and 6021 were not touched; a read-only `SCAN` of 6011 at the end shows 0 `bull:spike-task4*` keys. Nothing was committed and no OT status was changed. The host was heavily loaded (loadavg 14 to 37), so treat the timings as upper bounds.

All files are in `scratchpad/task4/`: `bin/` (stripped binaries), `licenses/` (license texts at pinned SHAs), `harness/` (`launch.mjs`, `exercise.mjs`, `socket-probe.cjs`, `keyv-sock.cjs`, `persist-probe.cjs`, `add-agentic.cjs`, `vk-start.sh`), the boot logs `server.log`, `server2.log` and `server3.log`, and `make.log`.

## Verdicts

| Criterion                               | Verdict                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| License                                 | **Ship Valkey (BSD-3-Clause).** Redis 7.4+ is RSALv2/SSPLv1 and Redis 8.x adds AGPLv3 as a third choice. All of those are on, or outside, the repo's own `license-policy.json` deny/allow lists (`SSPL-1.0` and `AGPL-3.0-*` are denied, RSALv2 is not allowed). Redis 7.2.x is still BSD, but it is a frozen line.                                                            |
| Binary                                  | **Valkey 9.1.3, built from source in 25 s.** `valkey-server` is **3.29 MB** stripped (1.32 MB gzip), it links **only `libSystem`**, and it is **1 Mach-O** to sign (2 if `valkey-cli` ships). Idle RSS is **5.0 MB**, or 8.8 to 9.0 MB with the server attached. Start to first `PONG` takes **10 to 27 ms**.                                                                  |
| BullMQ + pub/sub with the server booted | **PASS.** `serverHealth` returned all four `ok`, all 16 queues registered, 3/3 `agentic-test` jobs completed (Lua: `evalsha` 205 calls and `eval` 36, 0 failed), the Redis pub/sub plan-cancel path round-tripped, graphql-ws `connection_ack` was received and a subscription was accepted (an unauthenticated connection got `4403`), and the Bull Board rendered 16 queues. |
| Persistence                             | **Persist: AOF `everysec` plus RDB in `userData`.** An ephemeral Redis silently strands QUEUED plan runs (details below).                                                                                                                                                                                                                                                      |
| Ports                                   | **Unix socket in `userData`** (or a short `$TMPDIR` path). ioredis, BullMQ and `@keyv/redis` all work over it (measured), but the server's config accepts only host/port today. The change needed is below.                                                                                                                                                                    |
| **New bug found**                       | **The server process exits when Redis restarts:** an `uncaughtException` from the GraphQL Keyv cache client. Details in § Bug.                                                                                                                                                                                                                                                 |

## 1. License (texts fetched with `gh api … ?ref=<sha>`, copies in `licenses/`)

- **Redis 7.2.17** (latest 7.2 tag), BSD-3-Clause: [COPYING @ 83937c5](https://github.com/redis/redis/blob/83937c51afb53e1c69661c8e1533e0e19b896fe1/COPYING). "Redistributions in binary form must reproduce the above copyright notice…". Bundling is allowed with a notice. Every later fix lands in the 7.4+ and 8.x lines under the new licenses.
- **Redis 7.4.12**, RSALv2 or SSPLv1: [LICENSE.txt @ f9bc2f8](https://github.com/redis/redis/blob/f9bc2f89232fa3fc6147ee732309d2616117b85e/LICENSE.txt).
  - RSALv2 _Limitations_ (l.81): "You may not … distribute the Software … in a manner that makes the functionality of the Software available to third parties". A desktop app that embeds Redis distributes it to third parties, so this clause is in direct conflict.
  - SSPLv1 is copyleft, and the repo policy denies it.
- **Redis 8.8.4**, RSALv2, SSPLv1 or AGPLv3: [LICENSE.txt @ bab5911](https://github.com/redis/redis/blob/bab5911b2e3114b98b6ae1533c1a15a57ba539a8/LICENSE.txt).
  - The header says "Redis Open Source 7.2 and prior releases remain subject to the BSDv3".
  - The AGPLv3 option allows redistribution, but conveying the binary means offering its Corresponding Source (§6), and §13 adds the network-use obligation for modified versions. `license-policy.json` denies `AGPL-3.0-only/-or-later`.
- **Valkey 9.1.3**, BSD-3-Clause: [COPYING @ 29173b6](https://github.com/valkey-io/valkey/blob/29173b67508b2de4c0f0ed551f3b47cf19fc3ca8/COPYING). "License 1" is the Valkey contributors' BSD-3 and "License 2" is the Redis Ltd. 2006–2020 BSD-3. Both are on the allowlist.
  - Bundled `deps/` (Lua MIT, hdr_histogram BSD-2/CC0, fast_float, fpconv, linenoise) need entries in `THIRD-PARTY-LICENSES.md`. Homebrew's formula lists `BSD-3-Clause AND BSD-2-Clause AND BSL-1.0 AND MIT AND (CC0-1.0 OR BSD-2-Clause)`.
  - **BSL-1.0 is not on the allowlist** and would need a policy line or waiver if the gate scans the binary's deps. It is not checked automatically today.
- **Decision:** licensing alone decides it. Valkey is the only current, maintained candidate that is permissive. Redis 7.2.x BSD is a legal fallback, frozen at 7.2.

## 2. Binary (darwin-arm64, Valkey 9.1.3)

```
curl -sSL -o dl/valkey-9.1.3.tar.gz https://github.com/valkey-io/valkey/archive/refs/tags/9.1.3.tar.gz   # sha256 184e34ed…e293
tar -xzf dl/valkey-9.1.3.tar.gz -C src && cd src/valkey-9.1.3 && make -j8 BUILD_TLS=no        # real 25.3 s
cp src/valkey-server bin/ && strip -x bin/valkey-server
```

- **Sizes:** `valkey-server` is 3,646,112 B before strip and **3,287,920 B** after (1,320,391 B with `gzip -9`). `valkey-cli` is 581,112 B stripped.
- **`file`:** `Mach-O 64-bit executable arm64`.
- **`otool -L`:** only `/usr/lib/libSystem.B.dylib`. On macOS the malloc is libc (`--version`: `malloc=libc`), and Lua is linked statically.
- **No TLS is needed** over loopback or a unix socket. A TLS build would add an `openssl` dylib to sign.
- **Not built:** x86_64 or a universal binary. That needs a second `make` plus `lipo`, and is not measured.
- **Valkey-specific fact:** `INFO server` reports `redis_version:7.2.4` and `valkey_version:9.1.3`, so BullMQ's version gate passes. The Bull Board shows "7.2.4".

## 3. openthrottle-server against Valkey

- **Env** (`harness/launch.mjs`):
  - Postgres keys come from the server `.env`, parsed and never printed.
  - `REDIS_HOST=127.0.0.1`, `REDIS_PORT=7461`, `PORT=7462`, `PROCESS_ROLE=all`, `NODE_ENV=development`. Development is needed because `isBullBoardEnabled()` is `NODE_ENV !== 'production'`.
  - `OT_QUEUE_PREFIX=bull:spike-task4`, `OT_SCHEDULED_JOBS_OWNER=false`, `OT_BACKUP_OWNER=false`, `DATABASE_BACKUP_ENABLED=false`, `OT_WORKTREE_DB=shared`.
  - Empty `ANTHROPIC/OPENAI/XAI_API_KEY`, a fresh `JWT_SECRET`, and random spike Bull Board credentials (file mode 0600, deleted afterwards).
- **Health:** `{ serverHealth }` returned `{"api":"ok","database":"ok","redis":"ok","websocket":"ok"}`. The second boot, on the loaded host, reached healthy 10 s after launch.
  - At idle there are 16 `bull:spike-task4:<queue>:meta` keys and **53 client connections** (17 blocked in `BZPOPMIN`). Each Worker holds blocking connections, so set `maxclients` well above about 60.
- **BullMQ Lua and workers** (`harness/exercise.mjs`):
  - It logs in as the seeded dev user (test creds read from `scripts/bootstrap-default-user.ts`, not printed) and sends 3× `enqueueAgenticTest`, which returned job ids 1, 2 and 3.
  - Valkey afterwards: `completed=3 failed=0`, each job with `returnvalue {"echoedCount":3,…}`, `progress 100` and 6 log lines.
  - `INFO commandstats`: `evalsha calls=205 failed_calls=0`, `eval calls=36 failed_calls=0`, `bzpopmin 161`.
- **Redis pub/sub:** `PUBSUB NUMPAT` = 1 (`plan:*:cancel`). `PUBLISH plan:<random-uuid>:cancel 1` reached the server, which logged `Plan-cancel signal received for planId=4b6b1c21-… (local run not owned here)`.
  - **Correction to the brief:** the server does **not** use `graphql-redis-subscriptions`. `packages/nestjs-graphql/src/pubsub/pubsub.utils.ts` returns an in-memory `PubSub`, and the swap is only a comment. GraphQL subscriptions never touch Redis. The only Redis pub/sub is the plan-cancel channel (`queues/plans/cancel-channel/cancel-channel.service.ts`, `psubscribe`).
- **graphql-ws:** `mintSubscriptionToken`, then `connection_init { authToken }` gave `connection_ack`. A `queueJobLogTail` subscription was still open after 1.5 s. A connection without a token was closed with `4403`.
  - No event was delivered. Every topic that publishes needs a model key or writes shared plan state, so none was triggered. Delivery is in-process and independent of Redis.
- **Bull Board:** `GET /queues` with no auth gave `401`. With auth it gave `200`, `<title>Bull Dashboard`. `GET /queues/api/queues` returned 16 queues, with `agentic-test` showing `completed: 3` and jobs 3, 2 and 1 with `echoedCount` 3. `/queues/api/redis/stats` returned `version 7.2.4, clients connected 52, blocked 17`.
  - In production the board is off by design, so a packaged app would not mount it.
- **Valkey RSS:** 8.8 to 9.0 MB, `used_memory 2.4 MB`. Server RSS: 513 MB just after the test load and 347 MB idle.

## 4. Persistence (`harness/persist-probe.cjs`: a probe queue nobody consumes)

| Experiment                                                                       | Before                            | After restart                                                                                                                                  |
| -------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| E1: AOF `everysec`, a 20-job burst, then `kill -9` Valkey in the same shell line | 26 wait, 3 delayed, 1 scheduler   | **26 / 3 / 1 (0 lost)**. AOF loaded in 0.002 s, PONG after 10 ms.                                                                              |
| E2: AOF, graceful `SHUTDOWN`                                                     | 26 / 3 / 1                        | 26 / 3 / 1, plus a `dump.rdb` (9.7 KB)                                                                                                         |
| E3: ephemeral (`appendonly no`, `save ""`), `kill -9`                            | 6 / 3 / 1                         | **0 / 0 / 0**                                                                                                                                  |
| E3b: ephemeral, graceful `SHUTDOWN`                                              | 6 / 3 / 1                         | **0 / 0 / 0**. A normal quit loses the same as a crash.                                                                                        |
| E4: persistent; `agentic-test` job `crash-1` active, server `kill -9` 1.2 s in   | job in `active`, lock PTTL 58.7 s | Server restarted at once. The job was re-run as stalled (`stc=1`) and **completed 78 s after the crash** (lock 60 s + `stalledInterval` 30 s). |

- **Why E1 lost nothing:** a process crash leaves the written AOF in the kernel page cache. With `everysec`, only an OS crash or power loss can lose up to about 1 s of writes.
- **AOF growth with an idle server:** 104,900 B grew to 111,455 B in 45 s, about 8.7 KB/min or about 12.5 MB/day. The default `auto-aof-rewrite-min-size 64mb` compacts it, so it stays bounded.
- **What each queue holds, from the queue definitions in `applications/openthrottle-server/src/queues/*`:**
  - **Durable work, lost if Redis is ephemeral:**
    - **`Plans`** holds waiting and delayed plan runs. `enqueuePlanRun` writes the plan and the `plan_run` as `QUEUED` in Postgres and adds the job.
      - If the job vanishes, **nothing reconciles a QUEUED run that has no job.** The stale sweep only settles `IN_PROGRESS` runs past `STALE_CUTOFF_MS` (120 s), and the boot reconcile only covers `SCHEDULED` runs (`scheduled-plan-run.service.ts`, missing job → `MISSED`). The plan stays `QUEUED` until a human acts.
      - An active run on a server crash: with persistence it is re-delivered after about 360 s (the log line: lockDuration 300 s + stalledInterval 60 s, `maxStalledCount=1`). Without persistence the job is gone and the stale sweep resets the plan to PENDING.
    - **`Scheduled Agent Jobs`**: schedulers are re-upserted from the DB at boot by `reconcile.service.ts` (the DB is the authority, with a misfire policy). Lost: run-now, catch-up and usage-limit-resume delayed jobs (`usage-limit-resume.service.ts`).
    - **`plan-lifecycle-hooks`** (before/after-hook dispatch), **`task-promotion`**, **`plan-rules`** (`inject-task` / `promote-task-to-plan` executors), **`tagging`** and **`Code Index`** are event-driven one-shot jobs. A lost job is never re-enqueued.
  - **Not durable, rebuilt at boot by the owner:** the 8 repeatables (Work Ledger Sweep/Verify/Harvest, Daily Stats, Data Retention, Plan Runs Stale Sweep, Plan Run Worktree Reaper, Database Backup). `agentic-test` is a smoke test.
  - **Other Redis state** (all safe to lose):
    - The GraphQL Keyv cache.
    - The plan-cancel pub/sub, which is fire-and-forget backed by a durable DB marker.
    - The advisory directory lock (`directory-lock.service.ts`, TTL).
    - Completed/failed history (`removeOnComplete 1 d / 1000`, `removeOnFail 7 d`), used by the Bull Board and `queueJobLogs`.
- **Recommendation:**
  - Persist in `app.getPath('userData')/valkey/` with `appendonly yes`, `appendfsync everysec`, `save 300 1`, `maxmemory-policy noeviction` and `dir` set there.
  - Normal quit: stop the server first (SIGTERM; it stopped in about 2 s while idle), then `SHUTDOWN` Valkey, which fsyncs and writes the RDB. Nothing is lost, and an active job resumes as stalled on the next launch.
  - Crash: nothing is lost on a process crash, and at most about 1 s on power loss. Ephemeral is only acceptable after the follow-up "reconcile QUEUED runs with no job" exists.

## 5. Ports: unix socket vs TCP

- **Measured over `unixsocket <tmp>/valkey.sock`, `unixsocketperm 700`** (`harness/socket-probe.cjs`, `keyv-sock.cjs`):
  - ioredis `{ path }` plus BullMQ 5.81.3 (Queue, Worker, QueueEvents): 5 jobs and 1 delayed job completed, with results `[2,4,6,8,10,198]`, in 600 ms.
  - ioredis `psubscribe`/`publish` round-tripped.
  - `@keyv/redis` 4.6.0 with `{ socket: { path } }` did a set and get.
- **The server cannot use a socket today.** Four places take host and port only:
  - `packages/nestjs-bullmq/src/config/config.constants.ts` validates `REDIS_HOST: Joi.string().hostname().required()`, which rejects a path.
  - `resolveRedisConnection()` (`config.utils.ts`) returns `{host, port}`.
  - `createRedisClient()` (`nestjs-redis/.../redis-client.utils.ts`) builds `{host, port}`.
  - `getRedisCache()` builds a `redis://host:port` URI.
- **Change needed:**
  - Add an optional `REDIS_SOCKET_PATH`. When it is set, those four places pass `path` (ioredis), or `{ socket: { path } }` (Keyv) instead of a URI, and the Joi schema and the `REDIS_HOST`-required checks (`health.service.ts`, `queues-service.service.ts`, both `redisConfig`s) accept the socket path instead of a host.
  - About 6 files, no new dependencies.
- **Socket path length:** keep it under 104 bytes on macOS. The `userData` path is about 60 or more characters, so it fits. The sibling Postgres spike hit this limit with a deep cwd.
- **Fallback if the change is deferred:** run with `port 0` disabled, or pick an ephemeral port, then `bind 127.0.0.1`, `protected-mode yes` and a `requirepass` generated into `secrets.json`. The server already passes `REDIS_PASSWORD` everywhere.
- **Why a socket is better:** it never collides with a user's own Redis on 6379, nothing else on the machine can reach it (file mode 0700), and it needs no password.

## Bug: a Redis restart kills openthrottle-server (not Valkey-specific; client-side)

- **What happened:** in E1, while the server was attached, Valkey's `kill -9` and restart made the server exit. `server.log` shows `🚨 There was an "uncaughtException" exiting SocketClosedUnexpectedlyError: Socket closed unexpectedly` at `@redis+client@1.6.1/.../socket.js:194`.
- **Cause:**
  - `@keyv/redis` 4.6.0's `initClient()` attaches only `connect`, `disconnect` and `reconnecting` listeners to the underlying `@redis/client`, and **no `error` listener**.
  - `getRedisCache()` in `packages/nestjs-redis/src/config/redis/redis.utils.ts` listens on the `KeyvRedis` wrapper and on `Keyv`, not on `cacheRedis.client`.
  - The client's `error` event is therefore unhandled, and `main.ts:139` calls `process.exit(1)`.
- **The ioredis/BullMQ connections reconnect fine.** In E4, the restarted server recovered the job.
- **Fix:** add `cacheRedis.client.on('error', …)`, or construct the `@redis/client` ourselves and pass it in.
- **Desktop impact:** until it is fixed, the supervisor must restart the server whenever it restarts Valkey.
- **Follow-up:** this needs an OT follow-up plan (the caller owns filing it).

## Replacing Redis (T3 Code style): rough cost

- **BullMQ:** 16 queues, 16 `@Processor` workers, 8 cron repeatables plus dynamic job schedulers. Touchpoints: 79 files import `bullmq` or `@nestjs/bullmq`, 33 `@InjectQueue`/FlowProducer sites, and 34 `getJob`/`job.log`/`QueueEvents`-style call sites.
- **BullMQ features in use:** delayed jobs (scheduled runs, usage-limit resume), `jobId` idempotency, priority, stalled recovery, `upsertJobScheduler` with misfire handling, job logs and progress, and `obliterate`/`clean`.
- **Redis pub/sub:** 1 topic pattern (`plan:*:cancel`). GraphQL subscriptions (11 `@Subscription`s) are already in-process.
- **Other Redis uses:** the Keyv GraphQL cache, the advisory directory lock and the health ping.
- **Estimate:** a Postgres-backed queue (for example pg-boss or graphile-worker) or an outbox. The queue swap itself is mechanical but wide (16 processors, about 80 files). The real cost is re-creating stalled-lock semantics, job schedulers/misfire, the Bull Board and `queueJobLogs`, plus the plan-run cancel path. Call it a multi-week plan. Compare that with shipping a 3.3 MB single-Mach-O Valkey, which costs one supervisor and the socket change.

## Not measured

- x86_64/universal Valkey, and notarization with a real Developer ID.
- `appendfsync always` vs `everysec` under power loss (only a process kill was tested).
- A real plan-run job across a crash; it was deliberately not enqueued.
- Delivery of a graphql-ws event.
- Valkey under Electron `utilityProcess` supervision (it ran as a plain child here).
- Cleanup: all spike processes were stopped (Valkey `SHUTDOWN NOSAVE` after `FLUSHALL`, the server via SIGTERM; the first server instance had already exited through the bug above). The data dirs, socket dir and board credentials were deleted.
