# Generic scheduled agent jobs — design

**Status:** IMPLEMENTED (tasks 2–8). All decisions locked (§10 summary) and shipped; usage: [scheduled-agent-jobs-usage.md](../openthrottle/scheduled-agent-jobs-usage.md). Load-bearing architecture (shared queue, `upsertJobScheduler` on bullmq 5.76.6, JSONL sink reuse, producer/worker split, migration conventions) verified against the codebase; review-surfaced specification gaps (non-zero-exit status, run-now row lifecycle, api-role mutation-sync, retry/timeout/concurrency defaults, secrets, permissions) resolved inline.

**Implementation deltas (as shipped):** permissions reuse existing `settings:read`/`settings:write` + an owner check rather than dedicated `scheduled-jobs:{read,manage,run}` (those need a DB role-seed migration — a follow-up); `settings` is exposed over GraphQL as a JSON **string** (`settingsJson`) per the repo's no-GraphQLJSON-scalar convention; cross-process run cancellation ships as a durable marker + best-effort in-process abort (the pub/sub channel is a follow-up); and the UI ships a plain provider select + cron input (the chat model-picker rail, visual cron builder, and live-tail console are follow-up polish).
**OT plan:** `097c23b7-f314-412e-b3e8-eaa382b3fd79` (category `feature`).
**Pattern:** design doc → review → merge → sliced implementation (tasks 2–8 of the plan reference this doc). Precedent: [work-ledger-design.md](./work-ledger-design.md), [lifecycle-hooks-design.md](./lifecycle-hooks-design.md).

## Problem statement

Every recurring agent job today is bespoke: a code-defined queue + processor + `*-repeatable.service.ts`. There are five such cron services (`doc-ingestion`, `work-ledger-sweep`, `daily-stats`, `work-ledger-verify`, `plan-runs-stale-sweep`; plus `database-backup`). Each hardcodes its cron source (env var), its payload, and its command. There is **no way for a user to create a scheduled agent job at runtime**: no persistence, no create-repeatable mutation (only `repeatableJobs` listing + `removeRepeatableJob`), and the only agent worker — `PlansProcessor` — is hardwired to the Ralph orchestrator.

Target: a **generic** scheduled job. A user supplies a **prompt + provider (driver) / model / settings**, picks a **cron schedule + timezone**, and it runs on BullMQ's built-in repeatable machinery — **one shared queue, no new queue per job** — usable with any of the five agent CLIs.

The heavy lifting already exists in two places we reuse rather than reinvent:

1. **`@openthrottle/openthrottle-drivers`** — the invocation choke point (`getDriver`, `buildShellCommand`, `runDriverAsync`) already handles all five CLIs with streaming, abort, and timeout.
2. **The server's BullMQ + processor stack** — `PlansProcessor` already models heartbeat, AbortSignal cancellation, JSONL run-output, failed/stalled recovery, and startup reconciliation; `database-backup` already models `upsertJobScheduler`-based scheduling with cron validation and single-owner gating.

The net-new is small and additive: a thin drivers entrypoint, one queue + processor, a persistence pair, a reconciler, a GraphQL surface, and a UI.

---

## 1. Current-state audit

### 1.1 openthrottle-drivers surface (the choke point)

Source-first leaf package (`main`/`module`/`types` → `src/index.ts`; zero dependencies). Public API from `src/index.ts`:

| Symbol                                      | Shape                                                                                                                    | Relevance                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DRIVER_IDS` / `DriverId`                   | `['claude','codex','cursor','grok','opencode'] as const`                                                                 | The five providers. `DEFAULT_DRIVER_ID = 'cursor'`.                                                                                                                                                                                                                                                                             |
| `parseDriverId(raw, source?)`               | `→ DriverId`, throws `UnknownDriverError`                                                                                | Validation for the GraphQL layer + processor.                                                                                                                                                                                                                                                                                   |
| `getDriver(id)`                             | `→ AgentDriver`                                                                                                          | Resolves a driver object from an id.                                                                                                                                                                                                                                                                                            |
| `AgentDriver`                               | interface: `{ id, label, binary, binEnv?, buildShellCommand(config), capabilities, discoverModels?, versionArgs }`       | `buildShellCommand` → a single `shell:true` string; may throw `UnsupportedDriverModeError`.                                                                                                                                                                                                                                     |
| `DriverInvocationConfig`                    | `{ prompt (req), model?, cwd?, signal?, timeoutMs?, onChunk?, iteration (req), endpoint?, worktree? }`                   | **Already contains almost every field `runAgentPrompt` needs.** `onChunk: (chunk: DriverChunk) => void`.                                                                                                                                                                                                                        |
| `DriverCapabilities`                        | `{ chatStreaming, permissionMode, supportsModelFlag, supportsCustomBaseUrl, worktree, worktreeBase, skipWorktreeSetup }` | For model/endpoint validation.                                                                                                                                                                                                                                                                                                  |
| `DriverEndpointConfig`                      | `{ baseUrl, apiKey?, provider?, configFilePath? }`                                                                       | Local OpenAI-compatible endpoint targeting.                                                                                                                                                                                                                                                                                     |
| `runDriverAsync(driver, config, {logger?})` | `→ Promise<string>`                                                                                                      | **Streams** each chunk to `config.onChunk`; honors `timeoutMs` (SIGTERM→SIGKILL) and `signal` (AbortSignal). Returns merged trimmed stdout/stderr. **Resolves** (not rejects) with a `<promise>ERROR</promise>\n<label> iteration timed out…/was cancelled` sentinel on timeout/abort; **rejects only** on child spawn `error`. |
| `runDriverSync(...)`                        | `→ string`                                                                                                               | `spawnSync`; ignores signal/onChunk/timeout. Not used here.                                                                                                                                                                                                                                                                     |

**Gaps to close (task 2):**

- **No top-level "run once from an id" entrypoint.** Callers must `getDriver(parseDriverId(id))`, invent an `iteration`, and call `runDriverAsync` themselves. We add one.
- **No structured result.** The engine returns a single merged `string` plus the `<promise>ERROR</promise>` sentinel convention — no exit code, no separated streams, no typed status. We add a small result type that classifies the sentinel.
- **No `settings` concept.** The only tuning knobs are `model`, `endpoint`, and `worktree`. There is **no** arbitrary-flags mechanism (each driver hardcodes its flag set). "settings" in the plan payload therefore maps onto a **typed subset** (`endpoint`, `worktree`, `timeoutMs`), not free-form CLI flags — see §2.

### 1.2 BullMQ + processor stack

- **`@openthrottle/nestjs-bullmq`** exports `NestjsBullmqModule` (root wiring at decorator level — no `forRoot`; env-scoped `prefix`, `defaultJobOptions` with retries/cleanup) and `NestjsBullmqModule.registerQueue(name)`. Bull Board registration is the separate `@openthrottle/nestjs-bullmq-board` → `NestjsBullmqBoardModule.forFeature(name)`. No repeatable/scheduler helpers — scheduling is done directly on the `Queue`.
- **`REPEATABLE_JOB_OPTIONS`** (`queues/repeatable-job.options.ts`): bounded `attempts:3` + exponential backoff + age/count cleanup of completed (24h/50) and failed (7d/100) records. Spread into every scheduler's job opts.
- **Two scheduling patterns coexist.** Legacy `queue.add(name, data, { repeat: { pattern } })` (doc-ingestion, work-ledger-sweep, daily-stats, work-ledger-verify, plan-runs-stale-sweep) keys the schedule by a **pattern hash** — changing the cron leaves a stale duplicate (this caused a "2026-07-05 flood"). The modern `queue.upsertJobScheduler(stableId, { pattern, tz? }, { name, data, opts })` (database-backup only) keys by a **stable id**, so a cron change **replaces** the schedule. **We use `upsertJobScheduler`.**
- **`PlansProcessor`** (`queues/plans/plans.processor.ts`) is the processor template: `@Processor(name, { concurrency, lockDuration, maxStalledCount, stalledInterval, limiter })` extending `WorkerHost`; a wall-clock `setInterval` heartbeat (`.unref()`) cleared in `finally`; an AbortSignal attached per subject and detached in `finally`; `@OnWorkerEvent('failed'|'stalled')` handlers that reset durable status so nothing stays stuck; and `onModuleInit` reconciliation that tolerates the enqueue-after-commit window. `onApplicationShutdown` flushes writers + closes the worker.
- **Run-output sinks (two, both reusable):**
  - **JSONL file + live tail (free, no new wiring).** `KeyedJsonlWriter` is a `@Global()` singleton (`queues/bullmq-run-output.module.ts`, token `BULLMQ_RUN_OUTPUT_WRITER`, `@Optional()` — resolves `undefined` unless `BULLMQ_RUN_OUTPUT_DIR` is set). Processors call `writer?.appendRunChunk(queueName, jobId, { data, type, source })`; helpers in `bullmq-keyed-run-logging.ts` classify + mirror to the logger; `closeRunOutputForJob(...)` in `finally`. Keyed purely by `(queueName, jobId)`, this flows to the `queueJobLogs` history query and `queueJobLogTail` subscription **automatically** for any queue — no per-queue setup. (Live tail is single-process in-memory PubSub; history is filesystem JSONL.)
  - **DB plan-output stream** (`PlanOutputStreamService` → `plan_output_stream` keyed by `planId`) — used for `get_plan_output`/activity. Not applicable: scheduled jobs have no plan. We use the JSONL sink for logs and a **new runs table** for status/history (§4).
- **Role gating.** `config/process-role.ts` → `PROCESS_ROLES {all,api,worker}`; `app.module.ts` `buildImports(role)` gates WorkerHost modules behind `isWorkerLike` (`role !== 'api'`), GraphQL/HTTP behind `isApiLike` (`role !== 'worker'`). The established two-module convention:
  - `*-queue-producer.module.ts` — `registerQueue(NAME)` + `NestjsBullmqBoardModule.forFeature(NAME)`, exports `BullModule`. Loads under **any** role (producers/readers need the queue handle).
  - `*-queue.module.ts` — imports the producer module, provides the `@Processor` + repeatable/reconcile service. Loaded **only** under worker/all. _"so an api-only process doesn't create schedules no worker in this prefix would consume."_
- **`createQueue` caveat.** `graphql/queues/queues.service.ts#createQueue` makes a **producer-only** `new BullQueue(...)` with no WorkerHost — good for stats/listing, useless for execution. A generic job therefore needs a **statically-registered** processor, not a dynamic queue. This is the core reason for **one shared queue**, not per-job queues.

### 1.3 Prior art: `database-backup` (the closest existing feature)

[`database-backup-scheduled-job-spec.md`](../openthrottle/database-backup-scheduled-job-spec.md) is a single env-configured schedule; we generalize its hard-won mechanics to many DB-persisted schedules:

- `upsertJobScheduler(stableId, …)` keyed idempotently → cron change replaces, never duplicates.
- **Cron validation** rejecting foot-guns (bare `0`, `* * * * *`, illegal chars) with a fixed field count; a bad value is **rejected + logged**, never silently "disable".
- **Timezone** via `repeat.tz` (IANA); never encode offsets in the pattern.
- **Single-owner across checkouts** — `resolveBackupOwnership` treats any `openthrottle-worktrees/` checkout as a non-owner (many servers share one Redis). We reuse this principle so dev worktrees don't double-register user schedules.
- **ENABLED vs CRON are distinct switches.**

---

## 2. Drivers entrypoint (task 2) — `runAgentPrompt`

Add one exported function to `packages/openthrottle-drivers/src/engine` (re-exported from `src/index.ts`). It resolves a driver from an id, supplies the log-only `iteration` default, maps `settings` onto the typed knobs, runs through `runDriverAsync`, and classifies the sentinel into a **structured result** — the one genuinely net-new type in the package.

```ts
/** @public Provider-agnostic "run one prompt once" input. */
export interface RunAgentPromptConfig {
  readonly cwd?: string;
  readonly driverId: string; // validated via parseDriverId
  readonly model?: string;
  readonly onChunk?: (chunk: DriverChunk) => void;
  readonly prompt: string;
  readonly settings?: AgentPromptSettings;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

/** @public Typed subset that maps onto real driver knobs (NOT arbitrary flags). */
export interface AgentPromptSettings {
  readonly endpoint?: DriverEndpointConfig; // apiKey rejected at the GraphQL layer (§6)
  readonly worktree?: DriverWorktreeOptions;
}

export const RUN_AGENT_STATUS = {
  cancelled: 'cancelled',
  failed: 'failed', // process exited non-zero
  ok: 'ok', // process exited 0
  spawnError: 'spawn_error', // child never started
  timeout: 'timeout',
} as const;
export type RunAgentStatus =
  (typeof RUN_AGENT_STATUS)[keyof typeof RUN_AGENT_STATUS];

/** @public Structured result. `output` is buffered by runAgentPrompt itself, so partial
 *  output survives timeout/cancel (the engine discards its own buffer on those paths). */
export interface RunAgentPromptResult {
  readonly driverId: DriverId;
  readonly exitCode: number | null; // null on timeout/cancel/spawn error
  readonly model?: string;
  readonly output: string; // buffered stdout+stderr, sentinel line excluded
  readonly status: RunAgentStatus;
}

export const runAgentPrompt = async (
  config: RunAgentPromptConfig,
  options: RunDriverOptions = {},
): Promise<RunAgentPromptResult> => {
  /* getDriver(parseDriverId(id)) → build DriverInvocationConfig
     (iteration: 0) → runDriverAsync → classify exit/sentinel into RunAgentPromptResult */
};
```

Decisions:

- **Exit code is captured — non-zero ⇒ `failed`, not `succeeded`.** The engine's `runDriverAsync` receives the child exit code in `done(status)` and currently **discards** it: a CLI exiting 1 (auth failure, bad flag, crash) resolves normally with no sentinel. Tolerable for Ralph (which judged the output), **wrong** for a generic "did my job work" surface. Task 2 therefore also adds a **non-breaking exit-code seam** to the engine — an optional `onExit?: (code: number | null) => void` on `RunDriverOptions` (the string return is unchanged, so existing callers are unaffected). `runAgentPrompt` uses it to set `exitCode` and map non-zero → `RUN_AGENT_STATUS.failed`.
- **`runAgentPrompt` buffers its own output.** The engine returns **only** the sentinel string on timeout/abort (its collected stdout/stderr is dropped). So `runAgentPrompt` wraps the caller's `onChunk` to accumulate chunks itself, guaranteeing `output` holds whatever streamed before a timeout/cancel. The `<promise>ERROR</promise>` sentinel line is excluded from `output`.
- **Status classification, in order:** own abort/timeout bookkeeping first (track `signal.aborted` + an internal timer, **not** string-sniffing — a legitimate prompt could echo the sentinel text), then `exitCode` (0 → `ok`, non-zero → `failed`), then a thrown child `error` → `spawn_error`. The full sentinel format is matched only as a fallback.
- **`settings` is a strict typed subset**, not free-form flags — the package has no arbitrary-flags path. Only `endpoint`/`worktree` exist; unknown keys are a **validation error** at the GraphQL layer (§6), and the DB persists exactly this subset (§4) — there is no "arbitrary JSON" path. `model` stays first-class (already on `DriverInvocationConfig`).
- **Capability validation is surfaced, not silent.** If `model` is set but `driver.capabilities.supportsModelFlag` is false (or `endpoint` is set but `supportsCustomBaseUrl` is false), throw a typed error rather than dropping the flag. Cursor's quirk (emits `--model` even for `auto`) is preserved — we gate on capability, not per-driver behavior.
- **Timeout/abort resolve, not reject** — they become `status: 'timeout' | 'cancelled'`. Only a spawn failure is `spawn_error`. The processor derives run status from `result.status`.
- **Unit tests across all `DRIVER_IDS`** with a stubbed engine seam, asserting: id resolution, capability-mismatch errors, exit-code→status and sentinel→status classification, partial-output buffering on timeout, `onChunk` pass-through. Keep the package dep-free.

---

## 3. Generic queue (task 4)

| Property    | Value                                                                          | Rationale                                                                                                                                                                                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Queue name  | `Scheduled Agent Jobs`                                                         | Human-readable; matches `Database Backup`, `Doc Ingestion` in Bull Board.                                                                                                                                                                                                                                                                         |
| Job name    | `scheduled-agent-job`                                                          | Stable processor/logging identifier.                                                                                                                                                                                                                                                                                                              |
| Concurrency | `SCHEDULED_AGENT_JOBS_CONCURRENCY` (default **`1`**)                           | Two agent CLIs in the same default `cwd` (WORKSPACE_ROOT) would fight over the git index. Default 1; jobs that need parallelism must set a per-job `worktree` (isolated checkout) — then concurrency can be raised.                                                                                                                               |
| Timeout     | `SCHEDULED_AGENT_JOBS_TIMEOUT_MS` (default **15m**)                            | Worker-layer job timeout (BullMQ v5 has no per-job timeout); passed to `runAgentPrompt.timeoutMs` so a hung CLI can't hold the slot forever. Per-schedule override optional (§4 `timeout_ms`).                                                                                                                                                    |
| Payload     | `{ scheduleId, runId, prompt, driverId, model?, settings?, cwd?, timeoutMs? }` | Self-contained; the processor needs no DB read to execute. `runId` is pre-created by the enqueuer (see run-now, §6).                                                                                                                                                                                                                              |
| Job opts    | `{ attempts: 1, ...cleanup fields of REPEATABLE_JOB_OPTIONS }`                 | **`attempts: 1`** — agent prompts are non-idempotent + expensive, and driver failures _resolve_ (never throw), so BullMQ retries would only fire on a processor exception, producing duplicate run rows sharing one `bullmq_job_id`. Keep the `removeOnComplete`/`removeOnFail` cleanup from `REPEATABLE_JOB_OPTIONS`, drop `attempts`/`backoff`. |

**One shared queue, never per-job.** Per-job queues would each need a statically-registered WorkerHost — impossible at runtime (`createQueue` is producer-only). One queue + one processor decodes the payload's `driverId` and dispatches. This is the crux of the plan.

The payload embeds `prompt/driverId/model/settings` (a snapshot at schedule-registration time) so a run is reproducible and needs no DB lookup to execute. `scheduleId` links back to the row for `last_run_at`/`next_run_at` updates; `runId` is the pre-created `scheduled_agent_job_runs` row the processor _claims_ (it never creates a run row for run-now — see §6/§7). Editing a schedule re-upserts the scheduler with a fresh payload snapshot (§5); v1 has no live-edit-mid-run — snapshot wins.

**BullMQ `jobId` = `runId`.** Both scheduled fires and run-now set the BullMQ `jobId` to the run UUID. This makes the JSONL log join deterministic (`queueJobLogs(queueName, jobId=runId)`) and gives run-now idempotency for free. For repeatable fires, `upsertJobScheduler` generates per-iteration job ids; the processor pre-creates the run row inside `process()` in that case (it has no pre-created `runId`), so run-now and scheduled fires converge on "one run row, `bullmq_job_id` set" — see §7.

---

## 4. Persistence (task 3) — migration `082` + entities

Two tables, named to match the `ScheduledAgentJob*` GraphQL types (and to avoid a future collision with `database-backup`/other non-agent schedules). **`scheduled_agent_jobs`** is the user-authored schedule; **`scheduled_agent_job_runs`** is the append-only run history (status/timing) — distinct from the JSONL **log** sink, which the run row points into via `bullmq_job_id`.

```sql
-- 082_create_scheduled_agent_jobs.sql  (idempotent DDL; COMMENT ON per ot-postgres standard)
CREATE TABLE IF NOT EXISTS scheduled_agent_jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text        NOT NULL,
  prompt                text        NOT NULL,
  driver_id             text        NOT NULL,          -- one of DRIVER_IDS (validated app-side via parseDriverId; not CHECK'd — set grows)
  model                 text,                           -- nullable → driver default
  settings              jsonb       NOT NULL DEFAULT '{}'::jsonb, -- exactly AgentPromptSettings (endpoint w/o apiKey, worktree); validated on write
  cron_pattern          text        NOT NULL,           -- 5 or 6 field, validated (§6)
  timezone              text,                           -- IANA; null → UTC
  timeout_ms            integer,                         -- null → SCHEDULED_AGENT_JOBS_TIMEOUT_MS default
  enabled               boolean     NOT NULL DEFAULT true,
  scheduler_key         text        NOT NULL UNIQUE,    -- BullMQ upsertJobScheduler stable id: 'scheduled-job:<id>'
  cwd                   text,                           -- null → WORKSPACE_ROOT ?? process.cwd()
  owner_user_id         uuid        REFERENCES users(id),
  last_run_at           timestamptz,
  next_run_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_agent_job_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_agent_job_id uuid       NOT NULL REFERENCES scheduled_agent_jobs(id) ON DELETE CASCADE,
  bullmq_job_id         text,                           -- join key to queueJobLogs (queue, jobId); = run id for run-now
  status                text        NOT NULL DEFAULT 'queued',
  driver_id             text        NOT NULL,           -- snapshot
  model                 text,                           -- snapshot
  trigger               text        NOT NULL DEFAULT 'schedule',
  exit_code             integer,                         -- from runAgentPrompt; null on timeout/cancel/spawn error
  error_message         text,
  started_at            timestamptz,
  finished_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_scheduled_agent_job_runs_status
    CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  CONSTRAINT chk_scheduled_agent_job_runs_trigger
    CHECK (trigger IN ('schedule','manual'))
);
CREATE INDEX IF NOT EXISTS idx_scheduled_agent_job_runs_job
  ON scheduled_agent_job_runs (scheduled_agent_job_id, created_at DESC);
```

- **`scheduler_key`** is the durable link to BullMQ (`'scheduled-job:<uuid>'`), unique so reconciliation is idempotent.
- **`settings`** stores **exactly** the `AgentPromptSettings` subset (§2) — creation rejects unknown keys, so there is no "arbitrary JSON" here. **`endpoint.apiKey` is disallowed** (§6): never persist a plaintext key in Postgres + Redis job data + a GraphQL scalar; point users at server-side env config. Named enums (`status`, `trigger`) get CHECK constraints (convention: `chk_work_artifacts_source`, migration 068); `driver_id` stays app-validated because `DRIVER_IDS` grows.
- **`owner_user_id`** — ownership (nullable for system-seeded). Mutations gated by permission (§6) + owner check.
- TypeORM entities + repositories follow existing conventions (matching `plan_runs`/`agent_conversations`). Wire into `database:migrate` (idempotent ledger); re-apply must be a no-op.

Run **status** is the source of truth for the UI history table; run **logs** live in the JSONL sink and are fetched via `queueJobLogs(queueName:"Scheduled Agent Jobs", jobId: run.bullmqJobId)` / streamed via `queueJobLogTail`. JSONL files are pruned by `bullmq-run-output-retention.service.ts` while run rows live indefinitely, so the UI must tolerate `queueJobLogs` returning empty for an old run.

---

## 5. Reconciliation (task 5) — DB ↔ BullMQ

Split by concern, mirroring how `PlanRunCancellationService` lives in the **producer** module so both api and worker share it:

- **`ScheduledJobSchedulerService` — in the producer module (any role).** Holds the `@InjectQueue` handle and the two idempotent operations `upsertScheduler(row)` / `removeScheduler(schedulerKey)`. The GraphQL mutation service calls these **transactionally after the DB write commits** (enqueue-after-commit): create/update/enable → `upsertJobScheduler(row.scheduler_key, { pattern, tz? }, { name, data: <payload snapshot>, opts })`; disable/delete → `removeJobScheduler(row.scheduler_key)`. This is why mutation-sync must **not** live in the worker module — the resolver runs under `PROCESS_ROLE=api`, where the worker module isn't loaded. After each upsert, read the scheduler back (`getJobScheduler(key)` → `JobSchedulerJson.next`) and store `next_run_at` — no cron-parser dependency needed.
- **`ScheduledJobsReconcileService` — in the processor (worker) module, `OnModuleInit`.** Boot convergence only: load all `enabled = true` rows → `upsertScheduler` each; enumerate `getJobSchedulers()` and `removeJobScheduler(key)` for any `scheduled-job:*` with **no** enabled row (orphan sweep). This makes the DB authoritative and self-heals an out-of-band `removeRepeatableJob`/manual Redis edit on the next worker start — a stated invariant, not just "documented, not duplicated".
- **Single-owner guard applies to boot registration only.** Reuse the backup ownership principle (`resolveBackupOwnership`: any `openthrottle-worktrees/` checkout is a non-owner; env-overridable) so many dev workers on one Redis don't fight over the same scheduler set at boot. Mutation-sync always applies (a user editing a schedule must take effect immediately regardless of which checkout served the request); execution runs on any worker. In production (single worker, `PROCESS_ROLE=worker|all`) the guard always owns.
- **`next_run_at` freshness:** the processor refreshes both `last_run_at` and `next_run_at` (re-reading `getJobScheduler`) after **each** fire, so `next_run_at` doesn't go stale after the first run.
- **Idempotency:** stable `scheduler_key` means repeated upserts converge; a restart re-derives the full set from the DB.

---

## 6. GraphQL surface (task 6)

Code-first types + Result/ListResult conventions. **Relation to existing `repeatableJobs`/`removeRepeatableJob`:** those are low-level Bull Board introspection over _any_ queue's schedulers. Scheduled agent jobs are the **persistent, user-facing layer that owns** its schedulers; its schedulers will appear in `repeatableJobs(queueName:"Scheduled Agent Jobs")`, but must be managed through the new mutations (which keep the DB row + BullMQ in sync), **never** via `removeRepeatableJob` (which would orphan the DB row). Documented, not duplicated.

- **Types:** `ScheduledAgentJob { id, name, prompt, driverId, model, settings (JSON scalar, apiKey redacted on read), cronPattern, timezone, timeoutMs, enabled, cwd, ownerUserId, lastRunAt, nextRunAt, createdAt, updatedAt }`; `ScheduledAgentJobRun { id, scheduledAgentJobId, bullmqJobId, status, driverId, model, trigger, exitCode, errorMessage, startedAt, finishedAt, createdAt }`.
- **Queries:** `scheduledAgentJobs` (ListResult), `scheduledAgentJob(id)`, `scheduledAgentJobRuns(scheduledAgentJobId, pagination)`. Logs reuse existing `queueJobLogs`/`queueJobLogTail` (no new log query).
- **Mutations:** `createScheduledAgentJob`, `updateScheduledAgentJob`, `deleteScheduledAgentJob`, `setScheduledAgentJobEnabled(id, enabled)` (single toggle), `runScheduledAgentJobNow(id)`, `cancelScheduledAgentJobRun(runId)`.
  - **`runScheduledAgentJobNow`** pre-creates the `scheduled_agent_job_runs` row (`status:'queued'`, `trigger:'manual'`), enqueues one job with `jobId = runId` carrying `{ scheduleId, runId, ...snapshot }`, and returns that run. The processor **claims** the pre-created row (never double-creates). **Allowed on a disabled schedule** — useful to test before enabling.
  - **`cancelScheduledAgentJobRun`** sets a durable `cancel_requested_at` marker and publishes on a cross-process cancel channel (reuse the `PlanCancelChannelService` Redis pub/sub pattern — an in-process AbortSignal alone can't reach a run on another worker). If v1 ships without user cancel, drop this mutation and keep the processor's AbortSignal wired to **shutdown + timeout only** — state which; the recommendation is **include cancel** (the run row already needs the marker column — add `cancel_requested_at timestamptz`).
- **Validation (fail loud):** cron via a **shared** `validateCronPattern(pattern, { frequencyFloor })` — extract the _structural_ checks from backup's `validateBackupCronPattern` (5/6 fields, char whitelist, reject bare numbers) into a shared util, but keep the **frequency floor per-caller**: backup keeps its fixed-second+minute (≥ hourly) rule; scheduled jobs allow steps/lists/ranges in the minutes field but still reject `* * * * *`. Do **not** loosen backup's validator in place. `driverId` via `parseDriverId`; `model`/`endpoint` against `driver.capabilities` (unsupported → typed error); unknown `settings` keys **and** any `endpoint.apiKey` → validation error (§2/§4).
- **Permissions (must be explicit — this is prompt-driven command execution on the host).** Fresh users have zero permissions in this codebase, so name the strings and register them in the permission catalog: `scheduled-jobs:read` gates the queries, `scheduled-jobs:manage` gates create/update/delete/setEnabled, `scheduled-jobs:run` gates run-now + cancel. Resolvers use the same permission-guard decorator as existing resolvers; mutations additionally enforce the `owner_user_id` check.
- **Relation to `repeatableJobs`/`removeRepeatableJob`:** documented in §6 intro — coexist, manage via these mutations, never `removeRepeatableJob` (would orphan the DB row); boot reconcile self-heals if someone does.
- **Codegen flow:** bootstrap `openthrottle-server:dev` to regenerate `applications/openthrottle-server/schema.gql`, then `nx affected --target=codegen-graphql,codegen-react-router`; commit `schema.gql` + all `__generated__`. Resolver/service unit tests.

---

## 7. Processor (task 4, detail)

Model on `PlansProcessor`, minus the Ralph/plan specifics:

- `@Processor('Scheduled Agent Jobs', { concurrency, lockDuration, maxStalledCount, stalledInterval })` extends `WorkerHost`.
- `process(job)`: read `{ scheduleId, runId?, prompt, driverId, model, settings, timeoutMs }`. **Run row:** if `runId` is present (run-now pre-created it), **claim** it (`status:'running'`, `started_at`, `bullmq_job_id = job.id`); otherwise (scheduled fire) **create** the row with `trigger:'schedule'`, `bullmq_job_id = job.id`. Both converge on one `running` row with `bullmq_job_id` set. Attach an AbortSignal (a `ScheduledJobCancellationService` mirroring `PlanRunCancellationService`, keyed by run id, fed by shutdown + timeout + the cancel channel §6); call `runAgentPrompt({ prompt, driverId, model, settings, cwd: row.cwd ?? WORKSPACE_ROOT, signal, timeoutMs: timeoutMs ?? DEFAULT, onChunk })` where `onChunk` → `appendChildJobChunkToRunOutput(writer, queueName, job.id, chunk, { logger, logContext })`; on resolve, map `result.status` → run `status` (`ok`→`succeeded`; `failed`/`timeout`/`cancelled`/`spawn_error`→terminal) + `exit_code` + `finished_at` + `error_message`; refresh `scheduled_agent_jobs.last_run_at` **and** `next_run_at` (re-read `getJobScheduler`, §5).
- `finally`: `closeRunOutputForJob(...)`, `maybePruneAfterJobClose()`, detach cancel signal, clear heartbeat.
- **Heartbeat / staleness.** Agent runs are minutes-long, not short — keep the `lockDuration` auto-renewal (BullMQ renews the lock while `process()` runs). If the _only_ worker dies hard mid-run, its row stays `running` until a worker reboots and the `stalled` event fires; a follow-up staleness sweeper (precedent: `plan-runs-stale-sweep`) is the durable fix, out of scope for v1 — noted so it isn't mistaken for a bug.
- `@OnWorkerEvent('failed'|'stalled')`: mark the matching run row `failed` (defensively handle both arg shapes, as `PlansProcessor` does) so a crash never leaves a `running` row.
- `onApplicationShutdown`: close writers + worker.
- Unit-tested with a **stubbed `runAgentPrompt`**: asserts driver dispatch, run-row claim-vs-create, chunk→sink wiring, `exit_code`/status mapping (incl. non-zero→`failed`), cancellation, failed/stalled → `failed`.

---

## 8. Developer UI (task 7)

`applications/openthrottle-developer`, scaffolded via `@tools/generators:react-router`.

- **Nav + routes:** `/scheduled-jobs` (list), create/edit form, `/scheduled-jobs/:id` (detail + run history + live console).
- **Author form:** prompt editor; provider/model/settings picker reusing the chat model-picker rail / grouped provider components from `react-router-chat`; a cron builder (human-friendly + raw pattern) with timezone.
- **Detail:** run-history table (from `scheduledAgentJobRuns`) + a live run console reusing the Queues UI log-console (or the `queueJobLogTail` subscription directly, keyed by the run's `bullmqJobId`).
- Loaders/actions wired to the new mutations/queries; honest copy (no GraphQL op names surfaced). Co-located render-level tests.

---

## 9. End-to-end (task 8)

Create a schedule via GraphQL → reconciler upserts a BullMQ scheduler → processor fires → `runAgentPrompt` runs the driver → run row + JSONL logs recorded → UI shows history + live tail. Verify on an isolated/alt-port built server (runtime-verification pattern). Fill test gaps (drivers entrypoint, processor, reconciler, resolvers, UI); ensure no schema/codegen drift; `check:local` parity (mirror CI with run-many where the affected filter is narrowed). Update docs.

---

## 10. Locked recommendations (summary)

| Decision             | Recommendation                                                                                                                                                                                                                                                                                                                                      |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Drivers entrypoint   | Add `runAgentPrompt(config)` to `openthrottle-drivers`, wrapping `runDriverAsync` + a non-breaking `onExit` engine seam; **new** `RunAgentPromptResult` carries `exitCode` + status `ok\|failed\|timeout\|cancelled\|spawn_error` (non-zero exit ⇒ `failed`). Buffers its own output so partial output survives timeout/cancel.                     |
| `settings` semantics | Strict typed subset (`endpoint` w/o `apiKey`, `worktree`) applied to the driver; `model` first-class; persisted exactly (no arbitrary JSON); unknown keys **and** `apiKey` → validation error. Capability mismatches → typed error, never silent drop.                                                                                              |
| Queue                | **One** shared static queue `Scheduled Agent Jobs`, job `scheduled-agent-job`, **`attempts: 1`** (+ cleanup fields), concurrency **1** (raise only with per-job `worktree`), worker-layer timeout default 15m. Never per-job (createQueue is producer-only). Payload carries `{scheduleId, runId, snapshot}`.                                       |
| Scheduler mechanism  | `queue.upsertJobScheduler('scheduled-job:<id>', { pattern, tz? }, { …, opts })` — stable-id, replace-on-change. Not legacy `{ repeat }`. `next_run_at` read back from `getJobScheduler`.                                                                                                                                                            |
| Timezone             | `repeat.tz` IANA; never offsets in the pattern; null → UTC.                                                                                                                                                                                                                                                                                         |
| Persistence          | `scheduled_agent_jobs` + `scheduled_agent_job_runs` (migration 082; CHECK on status/trigger; `timeout_ms`, `exit_code`, `cancel_requested_at`). Runs table = status/history; logs = JSONL sink joined by `bullmq_job_id`.                                                                                                                           |
| Run logs             | Reuse `KeyedJsonlWriter` → `queueJobLogs`/`queueJobLogTail`, keyed by (queue, jobId=runId) — zero new sink wiring. UI tolerates empty logs for pruned old runs.                                                                                                                                                                                     |
| Reconciliation       | Mutation-sync (`upsert`/`remove` keyed by `scheduler_key`) in the **producer** module (shared across api/worker, precedent `PlanRunCancellationService`), transactional-after-commit; boot convergence + orphan sweep in the worker module; single-owner (non-worktree) guard on **boot registration only**. DB authoritative, BullMQ a projection. |
| Role-slicing         | `*-queue-producer.module.ts` (any role: registerQueue + board + scheduler-sync + cancel service) / `*-queue.module.ts` (worker/all: processor + boot reconciler). Register the processor module in `app.module.ts` `buildImports` `isWorkerLike` block.                                                                                             |
| GraphQL              | create/update/delete/setEnabled/runNow/cancelRun + list/get/runs; validate cron (shared structural + per-caller frequency floor)/driverId/model-capability; permissions `scheduled-jobs:{read,manage,run}` + owner check; coexist with (not replace) `repeatableJobs`/`removeRepeatableJob`.                                                        |
