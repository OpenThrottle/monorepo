# Plans queue: reproducing job interrupted by server restart

This doc describes how to reproduce the issue where a BullMQ plan-run job does not pick back up after the server is restarted mid-job. It supports the Cortex plan **Plans queue: job does not pick back up after server restart** (Plan-Id: `8795692b-4531-4cff-b6d0-0a219da9fe3e`) and the follow-up tasks (stalled job handling, plan status reconciliation).

## Prerequisites

- **Cortex DB** and **Redis** running (e.g. `docker compose -f docker-compose-databases.yml up -d cortex redis` or your stack).
- **openthrottle-server** running (e.g. `nx serve openthrottle-server` or your start command).
- A **plan** that exists in Cortex (e.g. create one via Cortex UI or MCP, or use an existing plan ID).
- Optional: a plan with a task that runs long enough that you can restart the server while the job is **active** (e.g. a task that sleeps or does many iterations). Otherwise you can restart as soon as the job starts.

## Steps to reproduce

### 1. Enqueue a plan run

**Option A – Cortex UI (developer app)**

- Open the plan detail page for the plan you want to run.
- Use the “Run plan” (or equivalent) action. This calls the `enqueuePlanRun` GraphQL mutation and adds a job to the `plans` queue.

**Option B – GraphQL**

From your GraphQL client (e.g. developer app GraphQL tab or any client pointing at the server):

```graphql
mutation EnqueuePlanRun($input: EnqueuePlanRunInput!) {
  enqueuePlanRun(input: $input) {
    jobId
    planId
  }
}
```

Variables:

```json
{ "input": { "planId": "<your-plan-uuid>" } }
```

Note the returned `jobId`; you can use it later to query the job with `job(jobId: "<id>", queueName: "plans")`.

After enqueue:

- The plan status is set to **QUEUED** (and tasks are reset to QUEUED as needed).
- The job is in the **waiting** (or **active** once the worker picks it up) state in Redis/BullMQ.

### 2. Let the job become active

- The plans worker has **concurrency 1**. As soon as the worker takes the job, the processor runs and sets the plan status to **IN_PROGRESS**.
- To make the “restart mid-job” window easier: use a plan whose run takes a while (e.g. a task that runs several iterations or sleeps). Otherwise, restart the server shortly after clicking “Run plan”.

### 3. Restart the server mid-job

While the plan is **IN_PROGRESS** and the job is being processed:

- **If running in terminal:** stop the server (e.g. Ctrl+C or kill the Node process).
- **If running in Docker:** restart the API container (e.g. `docker compose restart <api-service>`).
- Do **not** drain or gracefully shut down the queue; the goal is to simulate an abrupt stop so the worker disappears while the job is still “active” in Redis.

### 4. Start the server again

- Start openthrottle-server again (same way you normally do).
- The worker reconnects to Redis and the `plans` queue. Whether the interrupted job moves back to **waiting**, stays **active**, or is marked **stalled/failed** depends on BullMQ configuration (lock duration, stalled job detection) and is part of what this reproduction is meant to observe.

## What to observe

After restart, check both **BullMQ/Redis job state** and **Cortex plan status**.

### BullMQ job state (Redis / API)

**Option A – GraphQL `queues` / `queue`**

List queue stats to see job counts by state:

```graphql
query QueueStats {
  queues {
    name
    waitingCount
    activeCount
    completedCount
    failedCount
    delayedCount
  }
}
```

Or for the plans queue only:

```graphql
query PlansQueue($name: String!) {
  queue(input: { name: $name }) {
    name
    waitingCount
    activeCount
    completedCount
    failedCount
    delayedCount
  }
}
```

Variables: `{ "name": "plans" }`.

- **activeCount** – Jobs currently being processed. After an abrupt restart, the old job may still be counted as “active” until BullMQ’s lock expires or stalled job logic runs.
- **waitingCount** – Jobs waiting to be picked up. If the interrupted job is moved back to the queue, it will show here (possibly after a delay).
- **failedCount** – If the job is moved to failed (e.g. after stalled detection), it will show here.

**Option B – GraphQL `job` (by job id)**

If you have the `jobId` from step 1:

```graphql
query Job($jobId: ID!, $queueName: String!) {
  job(jobId: $jobId, queueName: $queueName) {
    id
    name
    data
    returnvalue
    failedReason
    finishedOn
    processedOn
    # ... other fields
  }
}
```

Variables: `{ "jobId": "<job-id>", "queueName": "plans" }`.

This shows whether the job is still active, completed, or failed, and any `failedReason`.

**Option C – Redis (optional)**

If you have Redis CLI access, you can inspect BullMQ keys for the `plans` queue (e.g. `bull:plans:*`) to see active/waiting/completed/failed sets and job data. The exact keys depend on your BullMQ version.

### Cortex plan status

Query the plan to see if its status was left as **IN_PROGRESS** or was reset:

**GraphQL**

```graphql
query Plan($id: ID!) {
  plan(id: $id) {
    id
    title
    status
    updatedAt
  }
}
```

Variables: `{ "id": "<plan-uuid>" }`.

- **Expected (current) buggy behavior:** The plan often stays **IN_PROGRESS** after restart because the processor set it to IN_PROGRESS at job start and never got to run the completion path. The job may or may not re-enter the queue (depending on stalled job handling), but the plan status is not reconciled.

## Current processor and queue behavior (detailed)

This section documents the behavior that is relevant to "job does not pick back up after server restart." It is the source of truth for the plan's "Document current processor and queue behavior" task.

### Processor

- **Plan status on job start:** The plans processor sets the Cortex plan status to **IN_PROGRESS** at the beginning of `process(job)` (see `applications/openthrottle-server/src/queues/plans/plans.processor.ts`: `repo.update({ id: planId }, { status: 'IN_PROGRESS' })`). It then runs Ralph (either via worktree workflow when `WORKTREE_TARGETS` is set, or in process cwd). On normal completion or failure the processor returns; it does not explicitly set the plan status to completed/failed in all paths—and on server kill it never runs the completion path, so the plan is left **IN_PROGRESS**.

### Worker

- **Concurrency:** The plans Worker is configured with **concurrency 1 only** via the `@Processor(PLANS_QUEUE_NAME, { concurrency: CONCURRENCY })` decorator, where `CONCURRENCY = 1` in the same file.
- **Lock and stalled job options:** The `@Processor` decorator passes **explicit** `lockDuration`, `stalledInterval`, and `maxStalledCount` from `applications/openthrottle-server/src/queues/plans/plans.constants.ts` (see `PLANS_WORKER_LOCK_DURATION_MS`, `PLANS_WORKER_STALLED_INTERVAL_MS`, `PLANS_WORKER_MAX_STALLED_COUNT`). This ensures long-running Ralph jobs are renewed correctly and, after restart, interrupted jobs become stalled and re-enter the queue within ~lockDuration + stalledInterval. See **Verified: BullMQ stalled job recovery** below.

### Default BullMQ job options

- **Root-level defaults:** In `packages/mattscholta/nestjs-bullmq/src/nestjs-bullmq.module.ts`, `BullModule.forRoot` sets **defaultJobOptions**: `attempts: 3`, `backoff: { type: 'exponential', delay: 2000 }`, `delay: 1000`, `keepLogs: 100`. These apply to all queues unless overridden per job or per queue. Worker-level options (lockDuration, stalledInterval) are not set in forRoot; each queue uses **defaultWorkerOptionsForRecovery** from `@openthrottle/nestjs-bullmq` (or queue-specific constants like plans) in its `@Processor` so jobs recover after restart.
- **Plans queue jobs:** Plan-run jobs are added with `this.plansQueue.add('run-plan', { planId })` and **no third-argument job options** (see `applications/openthrottle-server/src/graphql/plans/plans.resolver.ts`), so they inherit the root defaults (attempts, backoff, delay, keepLogs).

### Worktree tracker

- **In-memory and process-bound:** The worktree tracker used by the plans processor is the **in-memory** `WorktreeTargetsTracker` provided by `NestjsWorktreesModule` (see `docs/workflows/bullmq-processor-worktree.md` § In-memory vs Redis tracker). It is **not** persisted to Redis or the database.
- **Resets on restart:** On server restart, the Node process and thus the in-memory tracker are recreated. Any "locked" state (which worktree target was acquired by which job) is **lost**. The tracker has no knowledge of jobs that were active before the restart; worktrees that were held by the old process may appear "released" from the new process's perspective, or the new process may see all targets as available. This reinforces that worktree mode in development is not resilient until made more robust (see the dev warning in `PlansProcessor.onModuleInit`).

## Summary of current behavior (to document and fix)

- **Processor:** On job start, the plans processor sets the plan status to **IN_PROGRESS** and then runs Ralph (worktree or process cwd). On normal completion or failure it would update status or leave it; on server kill it never runs completion.
- **Worker:** Concurrency 1; explicit `lockDuration`, `stalledInterval`, and `maxStalledCount` on the plans Worker (see `plans.constants.ts`).
- **After restart:** The job remains in Redis as "active" until the lock expires (configured lockDuration, e.g. 60s), then the stalled checker moves it back to waiting. **Plan status reconciliation** on startup and on failed/stalled events resets plans to QUEUED when there is no active job.

Use this reproduction to validate any fixes for stalled job recovery, lock duration, and plan-status reconciliation on startup or on job failed/stalled events.

## Verified: BullMQ stalled job recovery for plans queue

The plans Worker is configured with **explicit** `lockDuration`, `stalledInterval`, and `maxStalledCount` via the `@Processor` decorator so that long-running Ralph jobs are renewed correctly and interrupted jobs are detected as stalled and retried after restart.

**Code path:**

- **Constants:** `applications/openthrottle-server/src/queues/plans/plans.constants.ts` — `PLANS_WORKER_LOCK_DURATION_MS` (60_000), `PLANS_WORKER_STALLED_INTERVAL_MS` (30_000), `PLANS_WORKER_MAX_STALLED_COUNT` (1).
- **Plans processor:** `applications/openthrottle-server/src/queues/plans/plans.processor.ts` — `@Processor(PLANS_QUEUE_NAME, { concurrency, lockDuration, stalledInterval, maxStalledCount })` passes these to the Worker.
- **NestJS BullMQ:** Forwards decorator options to `new Worker(queueName, processor, { connection, prefix, ...options })`.
- **Test:** `plans.processor.test.ts` describe block "BullMQ stalled job recovery" asserts Worker metadata includes these options.

| Option            | Plans queue value     | Meaning                                                                                              |
| ----------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `lockDuration`    | 60000 (60 s)          | Redis lock TTL; worker renews every lockDuration/2 (30 s). After process exit, lock expires in 60 s. |
| `stalledInterval` | 30000 (30 s)          | How often the worker runs the stalled-job check.                                                     |
| `maxStalledCount` | 1                     | When stalled, job is moved back to waiting (retry); after this many stalls it would move to failed.  |
| `lockRenewTime`   | lockDuration/2 (30 s) | Worker renews the lock every 30 s while the job is processing.                                       |

**Recovery flow after server restart:**

1. Before restart: Job is **active**, lock key in Redis has TTL 60 s and is renewed every 30 s by the worker.
2. Server stops: Worker process exits; no more lock renewal.
3. After ~60 s: Lock expires in Redis; job is still in the “active” set but the lock is gone.
4. When the server is back up: A new Worker connects and runs the **stalled job checker** every `stalledInterval` (30 s).
5. On the next stalled check: BullMQ moves the job back to **waiting** (or to **failed** if `maxStalledCount` is exceeded).
6. The worker picks the job from the waiting list and processes it again. **Plan status reconciliation** (on startup and on failed/stalled events) keeps Cortex plan status in sync with job state.

**Conclusion:** With the explicit plans Worker options, **active jobs become stalled and re-enter the waiting queue** after a restart within about **lockDuration + stalledInterval** (e.g. 60 s + 30 s = 90 s). Plan status reconciliation keeps Cortex in sync.
