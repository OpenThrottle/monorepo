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

## Related

- `databases/migrations/068_create_work_ledger_tables.sql` — the original schema and its comments.
- `databases/migrations/113_add_instant_to_work_sessions_closed_by.sql` — the `instant` value.
- `packages/openthrottle-mcp/src/session/session-headers.ts` — ambient session propagation.
- `applications/openthrottle-server/src/graphql/work-ledger/work-ledger-capture.service.ts` — the server-side capture path.

> **Note:** several files reference a `docs/monorepo/work-ledger-design.md` (with §-numbered sections) that is not present in this repo. Those references are dangling; this document does not attempt to reconstruct it.
