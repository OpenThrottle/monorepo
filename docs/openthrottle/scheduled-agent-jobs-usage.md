# Scheduled agent jobs — usage

Run any agent prompt on a cron schedule. Unlike the five code-defined cron services (doc-ingestion,
work-ledger-sweep, database-backup, …), scheduled agent jobs are **user-defined at runtime**: pick a
prompt + provider/model/settings + cron, and it runs on one shared BullMQ queue — no new queue per
job.

## Developer UI

**Agents → Scheduled Jobs** (`/scheduled-jobs`):

- **List** — every schedule with its provider/model, cron, enabled state, and next run.
- **New schedule** (`/scheduled-jobs/create`) — name, prompt, provider (claude | codex | cursor |
  grok | opencode), optional model, cron pattern (+ timezone), optional per-run timeout,
  **repository**, and JSON settings; starts enabled unless unchecked.
- **Detail** (`/scheduled-jobs/:id`) — the prompt, the target repository, run history
  (status/exit/timing), and **Run now**, **Enable/Disable**, **Delete**. Run logs stream to the
  queue-job log console keyed by each run's BullMQ job id.
- **Run detail** — the repository the run targeted and the exact directory it executed in. Both are a
  snapshot taken when the run fired, so they stay truthful after the schedule is edited or the
  checkout is deleted.

### Repository targeting

Pick the repository a schedule runs in from your registered checkouts (**Settings → Repositories**);
the server resolves it to a directory, so there is no path to type. The old free-text **Working
directory** field still exists behind _Advanced: explicit working directory_, but it is **deprecated**
— it is consulted only when no repository is selected. Existing `cwd`-only schedules keep working
untouched.

With no registered repositories the field says so and links to the add-folder / clone-repo flow;
schedules then run in the workspace root as before.

## GraphQL

Gated by `settings:read` (queries) / `settings:write` (mutations) plus an owner check on schedule
mutations.

- Queries: `scheduledAgentJobs`, `scheduledAgentJob(id)`, `scheduledAgentJobRuns(scheduledAgentJobId, limit)`.
  Schedules expose `repositoryCheckoutId` plus a resolved `repository { displayName filesystemPath }`;
  runs additionally expose `resolvedCwd`. `cwd` is `@deprecated` on both the objects and the
  create/update inputs — it is retained, never removed.
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
- **Repository** — a supplied `repositoryCheckoutId` must resolve for the schedule's owner, or the
  mutation fails with `Repository not found.` at create/update time rather than at 3am. On update the
  check runs against the existing row's owner; `ownerUserId` is never client-supplied. Passing both a
  repository and a `cwd` is accepted — the ladder below is deterministic and the repository wins.

## How it runs

1. A create/enable/update mutation writes the `scheduled_agent_jobs` row, then upserts a BullMQ
   repeatable scheduler keyed by the row's stable `scheduler_key` (`scheduled-job:<id>`), and stores
   the next-run time. Disable/delete removes the scheduler.
2. On cron fire (or **Run now**), the shared `Scheduled Agent Jobs` queue processor decodes the run
   snapshot, resolves where to run (see below), records a `scheduled_agent_job_runs` row carrying the
   targeted checkout and the resolved directory, and runs the prompt through the
   `openthrottle-drivers` `runAgentPrompt` entrypoint under an AbortSignal, streaming output to the
   JSONL log sink. The run row is the source of truth for status/exit; `failed`/`stalled` events are
   a crash safety net.

### Where a run executes (precedence)

One ladder, implemented in `resolveScheduledAgentJobRunCwd`:

1. **`repository_checkout_id`** → the checkout's `filesystem_path`, ownership-checked and translated
   through `toContainerPath` (identity on host-run flows, mount-aware under a containerized server).
2. **explicit `cwd`** — the deprecated free-text path (legacy rows, power users).
3. **`WORKSPACE_ROOT`**, else the detected OpenThrottle root, else `process.cwd()`.

The scheduler payload snapshots the resolved path, but a payload can be months stale, so the processor
**re-resolves from the checkout id on every fire** (one indexed read) and the moved checkout keeps
working. If the checkout has since been deleted the run falls back to the payload path and logs a
warning rather than being dropped; if nothing resolves to an existing directory the run fails with a
message naming the checkout, instead of an opaque driver error. Each run records the checkout it
targeted and its `resolved_cwd`, so run history stays truthful after later edits. 3. At worker boot, the reconciler converges BullMQ schedulers to the DB (registers enabled rows,
removes orphans) — the DB is authoritative, BullMQ is a projection.

## Configuration (env)

| Env                                  | Default               | Purpose                                                                                                                                |
| ------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `SCHEDULED_AGENT_JOBS_TIMEOUT_MS`    | `900000` (15m)        | Per-run timeout when a schedule sets none.                                                                                             |
| `SCHEDULED_AGENT_JOBS_CONCURRENCY`\* | `1`                   | Worker concurrency. Two CLIs in the same cwd fight over the git index; raise only with per-job `worktree`.                             |
| `WORKSPACE_ROOT`                     | `process.cwd()`       | Default cwd for the agent CLI when a schedule targets no repository and sets no `cwd`.                                                 |
| `OT_SCHEDULED_JOBS_OWNER`            | non-worktree checkout | Gates **boot** scheduler registration so many dev workers on one Redis don't fight (mutations always apply). `true`/`false` overrides. |

\* concurrency is a compile-time constant today; the env row documents intent.

## Known follow-ups

- Dedicated `scheduled-jobs:{read,manage,run}` permissions (currently reuses `settings:*`), which need
  a role-seed migration.
- Cross-process run cancellation (a pub/sub channel); today `cancelScheduledAgentJobRun` sets a
  durable marker + best-effort in-process abort.
- UI polish: a live-tail log console, the chat model-picker rail, and a visual cron builder.
- Per-repository keyed worker concurrency. Repository targeting makes `SCHEDULED_AGENT_JOBS_CONCURRENCY
  > 1` conceivable, but not safe on its own: two schedules can still target the same checkout, so it
  > needs a concurrency key derived from the resolved cwd.
- Repository targeting for Ralph plan runs, which resolve their working directory separately.
