# Work-ledger sessions: what a session is, and why history has no durations

`work_sessions` is the work ledger's spine — migration 068 calls it "one row per unit of work … with lifecycle timestamps". This doc records what a session actually means, because for a long stretch the table did not mean that at all, and the way it failed is easy to reintroduce.

If you are about to add a caller that writes to the ledger, read [Attributing a mutation](#attributing-a-mutation-to-an-open-session) first.

---

## ⚠️ The failure this documents

Pointed at a week of real, heavy use, the ledger looked like this:

|                                            |         |
| ------------------------------------------ | ------- |
| `work_sessions` in 7 days                  | 436     |
| of which instant (`ended_at = started_at`) | **435** |
| with a real duration                       | **1**   |

Every duration, concurrency and utilisation view inherits that emptiness. The `/timeline` route rendered 447 spans of which 446 carried no duration, and sub-row overlap stacking — the feature the view exists for — could not be demonstrated against real data under any grouping mode.

**Nothing was broken in a way anything could detect.** Every mutation succeeded. A session row was written every time. Only the _shape_ of the ledger was wrong, and no test, type or constraint has an opinion about shape.

### What actually caused it

Not what it looked like. The obvious reading — "agents open and close a session per MCP call" — was false. `packages/openthrottle-mcp/src/session/current-session.ts` has always held **one long-lived session per connection**, opened lazily and cached for the life of the process.

The server's capture path (`WorkLedgerCaptureService.resolveSession`) attributes a `status_change` to an ambient session when the request carries `X-OT-Session-Id`, and otherwise opens a fresh instant session. Only the work-ledger tools ever sent that header. `tools/tasks.ts` and `tools/plans.ts` did not.

So the MCP held a perfectly good open session and then made every `update_task` and `update_plan` call without mentioning it. Each one fell through to the instant branch. The session existed the whole time; nothing told the server about it.

The lesson worth keeping: **the span was lost in the gap between two components that each worked correctly.** The session was real, the capture path was correct, and the header contract was honoured — by a different module than the one making the calls.

---

## Attributing a mutation to an open session

A mutating tool call must carry the connection's ambient session:

```ts
import { ambientSessionOptions } from '../session/session-headers.ts';

const result = await executeGraphqlWithAuth(
  token,
  UpdateTaskDocument,
  { input },
  await ambientSessionOptions(token),
);
```

`ambientSessionOptions` reuses the open session and opens one on first use, so the mutations of a single agent run group under a single span.

Two rules that are not obvious from the call site:

- **Reads never attach it.** A query must not manufacture a session. A session that exists only because something was read is not a unit of work, and counting one is how you get a ledger full of rows that mean nothing.
- **Opening is best-effort.** If the session cannot be opened the mutation proceeds unattributed. Ledger attribution is layered on the caller's actual work and must never be the reason that work fails.

---

## `closed_by`: three values, because two could not tell the story

| value      | meaning                                                                         |
| ---------- | ------------------------------------------------------------------------------- |
| `explicit` | Closed by `endWorkSession` after real work. The session records a span.         |
| `instant`  | Instantaneous by nature — a single first-party mutation with no span to record. |
| `sweeper`  | Abandoned past the 24h TTL and closed by the sweeper.                           |

Migration 068 shipped only `explicit` and `sweeper`, folding instant sessions into `explicit`. That left `ended_at = started_at` as the **only** way to tell the two apart — and that arithmetic identity is precisely what let the failure above hide in plain sight for a week. 435 rows said `explicit` while meaning something else entirely.

A value that has to be inferred from a timestamp comparison is not a value the data carries. Migration 113 widened the CHECK so it is.

---

## 🚫 History is deliberately not backfilled

**Do not write durations onto historical sessions.** This is a decision, not an oversight, and it has been reached deliberately more than once.

The 435 zero-duration rows are a _faithful record_ of a period when the span was never captured. Any `ended_at` invented for them would be a guess dressed as a record — indistinguishable, later, from a genuine measurement. Worse, backfilling erases the only evidence of when the ledger started being correct, which is exactly the boundary anyone analysing this data needs to see.

The same applies to `closed_by`: rows written before migration 113 keep `explicit` even where they were plainly instant. New rows carry the new value; history stays as it was written.

If a query needs "sessions with a trustworthy span", the honest filter is on `closed_by` plus a start date — not a rewrite of the past.

---

## The guarantees the ledger is built on

The ledger rests on a handful of guarantees that code comments cite by label (`G5`, `G11`, …). They are defined here so a comment saying "G11" can be resolved by searching this doc. The labels keep the numbering they were given when the ledger was designed, so the gaps (no G1–G3, G7–G9 here) are expected and existing comments still resolve.

Two ideas underpin all of them.

**Who did the work is a column, not a convention.** Every session carries exactly one actor — `actor_user_id` or `actor_service_account_id`, enforced by a CHECK — stamped server-side from the authenticated request principal and never supplied by the client. `on_behalf_of_user_id` is the separate question of who the work is _for_, and only means something when the actor is a service account. `on_behalf_of_verified` records which of two things it is: a **verified fact** (inherited from a row the server stamped from an authenticated user) or an **unverified hint** (declared by a client, such as the MCP resolving `GITHUB_USER` to a user). The free-text `author` / `assignee` columns on plans and tasks stay as they were: they say who is _responsible_, the ledger says who _did_ it.

**Claims and facts are both stored, and `verification` says which is which.** An artifact an agent reports about itself (a commit sha, a PR) is a claim and starts `unverified`; a verifier upgrades it to `verified` once it has checked external reality, or marks it `orphaned`. An event the server itself witnessed — a task or plan status change — is a fact, so it is **born `verified`**. Verification is not exclusive to adapters; it just is not something a first-party event needs.

### G4 — `commit_links` was cut over in one plan, not run in parallel

Historical, and complete: it is cited only by `databases/migrations/075_drop_commit_links.sql`. Before the ledger, git provenance lived in a `commit_links` table. Rather than keep two schemas alive side by side, the cutover happened in one plan: existing rows were backfilled into `git_commit` artifacts (migration 069), writers dual-wrote only until every reader had moved to the ledger, and then the table was dropped (075, which asserts parity before dropping). The ledger is now the only home for commit provenance.

### G5 — Ralph worker sessions are actored to the real principal

The Ralph plan worker is server-side code, so `WorkLedgerRunService` opens and closes its run session directly through the repositories rather than calling GraphQL on itself. The session's actor is the worker's **own** service-account principal, resolved from the same bearer token the orchestrator uses for its status mutations (falling back to the seeded `workflow-ralph` account by name only when no token resolves). Two things follow:

- `on_behalf_of_user_id` is inherited from `plan_runs.actor_user_id`, which the server stamped from an authenticated principal at enqueue time, so it is saved with `on_behalf_of_verified = TRUE`. This is the one path where the human behind machine work is a verified fact rather than a hint.
- Because the session actor equals the principal the server sees on the orchestrator's mutations, the ambient-session check in G11 passes, and those status changes attach to the run session instead of each opening an instant one.

The MCP path stays at the weaker tier: its `GITHUB_USER` hint is always unverified. Minting per-machine or per-human credentials would harden it, but that is deferred, and session-open code must not pin the actor to the seeded service account in the meantime.

All of this is best-effort and never throws — ledger bookkeeping must not break a plan run.

### G6 — Abandoned sessions are swept after 24 hours

A producer that crashes or is killed never calls `endWorkSession`. An hourly sweeper job closes any session that is still open and was started more than 24 hours ago: `ended_at` becomes the session's last artifact `produced_at` (or its `started_at` if it has none) and `closed_by` becomes `sweeper`.

The sweeper is pure hygiene. It writes no verification or lifecycle state, only closes the session, and it is idempotent because a closed session never matches again. Recording `sweeper` instead of `explicit` is what keeps "ran to completion" distinguishable from "the process died" — a reliability signal, not just tidiness (see [`closed_by`](#closed_by-three-values-because-two-could-not-tell-the-story)).

### G10 — Dedupe is per artifact type

The unique key is `(session_id, type, external_key)`, but what a re-report _means_ differs by type, so each type in the server-side registry declares `identity: 'idempotent' | 'event'`:

- **`idempotent`** (`git_commit`, `pull_request`, and others such as `document`): the `external_key` is the canonical identity, so re-reporting the same sha or PR upserts. Payload and message may be promoted; lifecycle and verification never regress.
- **`event`** (`status_change`): append-only. The registry derives a base key from the transition (`status_change:<entity>:<id>:<to>`) and the write path appends a discriminator, so each report is a distinct row. `PENDING → IN_PROGRESS → COMPLETED` in one session therefore yields separate rows rather than the second transition overwriting the first. The unique constraint still holds because event keys never collide.

Dedupe is per session on purpose: two sessions may legitimately claim the same commit, and grouping across sessions happens at query time by `external_key`.

### G11 — `X-OT-Session-Id` is validated, never trusted

The header is client-supplied, so the server cannot take it at its word. When it resolves a session for a mutation it accepts the id only if that session exists **and** its actor matches the authenticated request principal. On a mismatch or an unknown id it **ignores the header and opens an instant session instead — it never errors.**

That one rule does two jobs. A caller cannot attribute work to someone else's session by guessing or replaying an id, which closes attribution spoofing. And a stale id after an MCP reconnect cannot fail the mutation, because an id that does not match simply yields a fresh instant session — the reconnect case needs no special handling.

### G12 — A status change and its evidence commit together

A task or plan status transition writes a `status_change` artifact in the **same database transaction** as the row update. The transaction wraps exactly `{ save(entity); insert session; insert subject; insert artifact }`, using one `dataSource.transaction` / `manager.transaction`. The fact (`completed_at`) and its evidence (the ledger row) can therefore never diverge — the failure mode that forced the old `completed_at` backfills. The capture step only throws on an unresolved principal, and when it does the row update rolls back with it. It runs only on a real transition, not a no-op re-assert of the same status.

The **downstream reactions stay outside** the transaction, as they always were: reconciling the parent plan's status, emitting notifications, and enqueueing rules evaluation. Those are consequences of the fact, not part of it.

### G13 — Facts get transactions, reactions get idempotent retry

G13 is the line G12 draws, stated as a rule. A fact is written atomically; a reaction to it is allowed to fail and is repaired by retrying something idempotent. OT has no transactional outbox anywhere, and the ledger's one lifecycle-to-trigger edge (a `git_commit` reaching `landed` enqueues refine-tagging) does not justify introducing one.

Durability instead comes from the verifier. It is a scheduled sweep that re-queries the artifacts it has not finished with each time it runs, and the refine enqueue uses a deterministic job id, so a sweep that dropped work simply picks it up on the next pass and a duplicate enqueue collapses. The same philosophy is behind the other scheduled ledger jobs: the harvest sweep keeps a cursor so an interrupted run resumes where it stopped.

## Where the original design doc went

The ledger was designed in `docs/monorepo/work-ledger-design.md` (PR #185). That doc was removed by commit `2b8e39b1` in the pre-public markdown cleanup (PR #291), which swept every `docs/monorepo/*-design.md` out of the tree. It was not lost: `git show 2b8e39b1^:docs/monorepo/work-ledger-design.md` prints it in full, numbered sections and all. The guarantees above are the parts of it the code still leans on, restated against how the code behaves today — where the two disagree, trust this doc and the code over the archive.

Code and database comments no longer cite it. **One knowing exception:** the text of the applied migration files still does. `databases/migrations/068_create_work_ledger_tables.sql` names the doc in its header and cites its sections both in plain `--` comments and in its original `COMMENT ON` statements, and `113_add_instant_to_work_sessions_closed_by.sql` cites a section in the `closed_by` comment it set. Those files stay as written because applied migrations are checksummed and immutable (`databases/README.md` § Run-once / idempotent). The comments the database actually carries now were re-issued without citations by `databases/migrations/129_strip_design_doc_citations_from_work_ledger_comments.sql`, which runs after both. Read the 068 and 113 file text as a record of what was applied, not as live documentation.

---

## Related

- `databases/migrations/068_create_work_ledger_tables.sql` — the original schema and its comments.
- `databases/migrations/113_add_instant_to_work_sessions_closed_by.sql` — the `instant` value.
- `databases/migrations/129_strip_design_doc_citations_from_work_ledger_comments.sql` — the current table and column comments.
- `packages/openthrottle-mcp/src/session/session-headers.ts` — ambient session propagation.
- `applications/openthrottle-server/src/graphql/work-ledger/work-ledger-capture.service.ts` — the server-side capture path.
