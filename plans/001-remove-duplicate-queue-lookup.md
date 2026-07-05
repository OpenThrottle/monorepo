# Plan 001: Remove the dead duplicate queue-lookup branch in QueuesService

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9d10ccc6..HEAD -- applications/openthrottle-server/src/graphql/queues/queues.service.ts`
> If that file changed since this plan was written, compare the "Current state"
> excerpt against the live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `9d10ccc6`, 2026-07-05

## Why this matters

`QueuesService.getQueueByName` contains the same `if (name === DOC_INGESTION_QUEUE_NAME)` branch twice in a row. The second copy is unreachable dead code. It is harmless at runtime but signals a copy-paste error: if the second branch was _meant_ to match a different queue name, some queue is silently unreachable by name. Removing the duplicate makes the lookup table correct-by-inspection and removes a latent trap for the next editor.

## Current state

- `applications/openthrottle-server/src/graphql/queues/queues.service.ts` — maps a queue name string to its BullMQ `Queue`. The `getQueueByName` method is a chain of `if (name === X_QUEUE_NAME) return ...` branches.

Excerpt as it exists today (around lines 322–340):

```ts
if (name === DAILY_STATS_QUEUE_NAME) {
  return this.dailyStatsQueue as Queue<AnyJobData, void>;
}

if (name === DATABASE_BACKUP_QUEUE_NAME) {
  return this.databaseBackupQueue as unknown as Queue<AnyJobData, void>;
}

if (name === DOC_INGESTION_QUEUE_NAME) {
  return this.docIngestionQueue as unknown as Queue<AnyJobData, void>;
}

if (name === DOC_INGESTION_QUEUE_NAME) {
  return this.docIngestionQueue as unknown as Queue<AnyJobData, void>;
}

if (name === PLANS_QUEUE_NAME) {
  return this.plansQueue as Queue<AnyJobData, void>;
}
```

The two `DOC_INGESTION_QUEUE_NAME` blocks are byte-identical; the second is dead.

## Commands you will need

| Purpose                  | Command                                                                                                             | Expected on success |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck                | `pnpm nx run openthrottle-server:typecheck`                                                                         | exit 0, no errors   |
| Test                     | `pnpm nx run openthrottle-server:test`                                                                              | all pass            |
| Lint                     | `pnpm nx run openthrottle-server:lint`                                                                              | exit 0              |
| Confirm no double branch | `grep -c "name === DOC_INGESTION_QUEUE_NAME" applications/openthrottle-server/src/graphql/queues/queues.service.ts` | prints `1`          |

## Scope

**In scope** (only file to modify):

- `applications/openthrottle-server/src/graphql/queues/queues.service.ts`

**Out of scope** (do NOT touch):

- The other queue branches or the queue name constants — only the duplicate is removed.
- `queues.service.test.ts` unless typecheck/test fails and points there.

## Git workflow

- Work on the single shared PR branch the operator assigns for these plans.
- Commit style: conventional commits, no attribution/`Co-authored-by` lines. Example: `fix(openthrottle-server): drop unreachable duplicate queue lookup branch`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Delete the second `DOC_INGESTION_QUEUE_NAME` block

Remove the second of the two identical blocks (keep the first):

```ts
if (name === DOC_INGESTION_QUEUE_NAME) {
  return this.docIngestionQueue as unknown as Queue<AnyJobData, void>;
}
```

Leave exactly one `DOC_INGESTION_QUEUE_NAME` branch in place, and leave the surrounding `DATABASE_BACKUP_QUEUE_NAME` / `PLANS_QUEUE_NAME` branches unchanged.

**Verify**: `grep -c "name === DOC_INGESTION_QUEUE_NAME" applications/openthrottle-server/src/graphql/queues/queues.service.ts` → prints `1`

### Step 2: Typecheck, lint, test

**Verify**:

- `pnpm nx run openthrottle-server:typecheck` → exit 0
- `pnpm nx run openthrottle-server:lint` → exit 0
- `pnpm nx run openthrottle-server:test` → all pass

## Test plan

No new test required — this removes provably dead code with no behavior change (the first identical branch already handles `DOC_INGESTION_QUEUE_NAME`). The existing `queues.service.test.ts` continuing to pass is the regression guard.

## Done criteria

ALL must hold:

- [ ] `grep -c "name === DOC_INGESTION_QUEUE_NAME" applications/openthrottle-server/src/graphql/queues/queues.service.ts` prints `1`
- [ ] `pnpm nx run openthrottle-server:typecheck` exits 0
- [ ] `pnpm nx run openthrottle-server:test` exits 0
- [ ] `pnpm nx run openthrottle-server:lint` exits 0
- [ ] `git status` shows only `queues.service.ts` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report (do not improvise) if:

- The two `DOC_INGESTION_QUEUE_NAME` blocks are NOT identical (e.g. the second returns a different queue or checks a different constant) — that would mean a real routing bug, not dead code; report the exact two blocks.
- There are not exactly two `DOC_INGESTION_QUEUE_NAME` branches (0, 1, or 3+) — the code has drifted; report what you found.
- Typecheck or test fails after the deletion.

## Maintenance notes

- Reviewer: confirm the deleted block was the exact duplicate and every queue name still maps to exactly one queue.
- If new queues are added to this method later, keep one branch per queue name and consider whether a `Map`-based lookup would prevent this class of copy-paste duplication (out of scope here).
