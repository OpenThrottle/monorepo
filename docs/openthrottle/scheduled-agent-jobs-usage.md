# Scheduled agent jobs — usage

Run any agent prompt on a cron schedule. Unlike the five code-defined cron services (doc-ingestion,
work-ledger-sweep, database-backup, …), scheduled agent jobs are **user-defined at runtime**: pick a
prompt + provider/model/settings + cron, and it runs on one shared BullMQ queue — no new queue per
job. Design: [docs/monorepo/scheduled-agent-jobs-design.md](../monorepo/scheduled-agent-jobs-design.md).

## Developer UI

**Agents → Scheduled Jobs** (`/scheduled-jobs`):

- **List** — every schedule with its provider/model, cron, enabled state, and next run.
- **New schedule** (`/scheduled-jobs/create`) — name, prompt, provider (claude | codex | cursor |
  grok | opencode), optional model, cron pattern (+ timezone), optional per-run timeout, working
  directory, and JSON settings; starts enabled unless unchecked.
- **Detail** (`/scheduled-jobs/:id`) — the prompt, run history (status/exit/timing), and **Run now**,
  **Enable/Disable**, **Delete**. Run logs stream to the queue-job log console keyed by each run's
  BullMQ job id.

## GraphQL

Gated by `settings:read` (queries) / `settings:write` (mutations) plus an owner check on schedule
mutations.

- Queries: `scheduledAgentJobs`, `scheduledAgentJob(id)`, `scheduledAgentJobRuns(scheduledAgentJobId, limit)`.
- Mutations: `createScheduledAgentJob`, `updateScheduledAgentJob`, `deleteScheduledAgentJob`,
  `setScheduledAgentJobEnabled`, `runScheduledAgentJobNow`, `cancelScheduledAgentJobRun`.

Run logs are **not** on these types — read them via `queueJobLogs` / `queueJobLogTail` with
`queueName: "Scheduled Agent Jobs"` and `jobId` = the run's `bullmqJobId`.

### Validation (fails loud)

- **Cron** — 5- or 6-field; may not fire sub-minute (fixed seconds) or every minute (bare `*`
  minutes). Steps/lists/ranges in the minutes field are allowed (`*/15 * * * *`, `0,30 * * * *`).
- **Provider** — must be a known driver id (`parseDriverId`).
- **Capability** — a `model` requires the driver to support a model flag; a `settings.endpoint`
  requires custom-base-URL support; `settings.worktree` requires worktree support. Mismatches are
  rejected, never silently dropped.
- **Settings** — exactly `{ endpoint?, worktree? }`. Unknown keys and `endpoint.apiKey` are rejected
  (never persist a plaintext key — configure keys via server env).

## How it runs

1. A create/enable/update mutation writes the `scheduled_agent_jobs` row, then upserts a BullMQ
   repeatable scheduler keyed by the row's stable `scheduler_key` (`scheduled-job:<id>`), and stores
   the next-run time. Disable/delete removes the scheduler.
2. On cron fire (or **Run now**), the shared `Scheduled Agent Jobs` queue processor decodes the run
   snapshot, records a `scheduled_agent_job_runs` row, and runs the prompt through the
   `openthrottle-drivers` `runAgentPrompt` entrypoint under an AbortSignal, streaming output to the
   JSONL log sink. The run row is the source of truth for status/exit; `failed`/`stalled` events are
   a crash safety net.
3. At worker boot, the reconciler converges BullMQ schedulers to the DB (registers enabled rows,
   removes orphans) — the DB is authoritative, BullMQ is a projection.

## Configuration (env)

| Env                                  | Default               | Purpose                                                                                                                                |
| ------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `SCHEDULED_AGENT_JOBS_TIMEOUT_MS`    | `900000` (15m)        | Per-run timeout when a schedule sets none.                                                                                             |
| `SCHEDULED_AGENT_JOBS_CONCURRENCY`\* | `1`                   | Worker concurrency. Two CLIs in the same cwd fight over the git index; raise only with per-job `worktree`.                             |
| `WORKSPACE_ROOT`                     | `process.cwd()`       | Default cwd for the agent CLI when a schedule sets none.                                                                               |
| `OT_SCHEDULED_JOBS_OWNER`            | non-worktree checkout | Gates **boot** scheduler registration so many dev workers on one Redis don't fight (mutations always apply). `true`/`false` overrides. |

\* concurrency is a compile-time constant today; the env row documents intent.

## Known follow-ups

- Dedicated `scheduled-jobs:{read,manage,run}` permissions (currently reuses `settings:*`), which need
  a role-seed migration.
- Cross-process run cancellation (a pub/sub channel); today `cancelScheduledAgentJobRun` sets a
  durable marker + best-effort in-process abort.
- UI polish: a live-tail log console, the chat model-picker rail, and a visual cron builder.
