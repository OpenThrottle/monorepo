# Chat turn idle-timeout backstop + auto-retry recovery

**Status:** design locked (OT plan `039454a0-a880-4c18-9b5d-0f761008e006`, task 1)
**Applies to:** the streaming chat turn shared by `openthrottle-developer`, the global header chat, and `openthrottle-admin`.

## Problem recap

A chat turn can "hang": the backend stalls, no further deltas arrive, and no
terminal `done` chunk is ever published. The server's `runStream()` `for await`
loop blocks indefinitely, so the turn never persists and never emits a terminal
chunk; the client stays `isStreaming: true` forever and the composer is stuck.
The only exit today is the manual Stop button, and there is no retry anywhere.

This note locks the small set of contracts the rest of the plan depends on.

## Verified layers we build on

- **CLI backends already self-terminate** (claude/codex/grok/cursor-agent/opencode):
  each wraps its subprocess in an idle timer (`resetIdle()` →
  `terminate('idle timeout')`) + wall-clock cap via `resolveAgentTimeouts()`
  (`idleMs` 120_000, `wallClockMs` 900_000, `graceMs` 5_000), with a
  SIGTERM→SIGKILL teardown.
- **HTTP/OpenAI backend is unbounded** (`chat-completions/stream.ts`): only
  forwards `options.signal`; a silent endpoint hangs the async iterator (task 3).
- **Orchestrator has no backstop** (`ConversationStreamService.runStream()`): it
  trusts each backend to terminate (task 2).
- `resolveAgentTimeouts()` lives in
  `conversation-backend/cursor-agent/teardown.ts` and is already reachable from
  the package main (`@openthrottle/openthrottle-agentic-utils`) via the
  `conversation-backend` barrel.

## Decision 1 — Config knob (idle-only)

Add a **chat-scoped alias** rather than reusing the raw agent knob directly.

- New helper in `teardown.ts` (exported from the package main):
  `resolveChatIdleTimeoutMs(env = process.env): number`.
- Env override: **`OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS`**.
- Fallback when unset: `resolveAgentTimeouts(env).idleMs + DEFAULT_CHAT_IDLE_MARGIN_MS`.
- `DEFAULT_CHAT_IDLE_MARGIN_MS = 30_000`.
- Effective default: **150_000 ms** (120s agent idle + 30s margin).

**Why an alias with a margin, not the raw agent value:** the orchestrator
backstop must sit _above_ the layer that can produce a cleaner terminal. A CLI
backend that idles out at 120s emits its own terminal `done` chunk (with its own
error) and tears the child down; the orchestrator resets its idle timer on every
chunk **including that terminal**, so it observes the terminal and breaks
normally. The 30s margin guarantees the CLI's own idle+SIGTERM→SIGKILL teardown
(≤ `idleMs + graceMs`) gets to finish first, so the orchestrator fires **only**
for the pathological cases it is meant to catch: the unbounded HTTP backend, or a
CLI that wedged without emitting anything. Ops can still tune the orchestrator
independently of CLI behavior via the alias env.

**Idle-only** on the orchestrator: no wall-clock cap. Long, healthy CLI runs that
keep emitting output are never interrupted; the CLI backends keep their own
900s wall-clock as the last resort. The HTTP-backend idle timeout (task 3) uses
the plain `resolveAgentTimeouts().idleMs` (120s), so the layering is:

```
HTTP backend idle (120s)  <  orchestrator backstop (150s)   [HTTP path]
CLI backend idle (120s)   <  orchestrator backstop (150s)   [CLI path]
```

## Decision 2 — Retryable terminal-chunk contract

On idle expiry the orchestrator publishes the normal terminal chunk shape
(`done: true`) but populates two fields that a healthy completion leaves empty:

- `error`: a clear human message, e.g.
  `"The response timed out after 150s with no activity."`
- `metadataJson`: `JSON.stringify({ retryable: true, timedOut: true })`.

**Exact metadata shape** (parsed from the terminal chunk's `metadataJson`):

```ts
interface TerminalTimeoutMetadata {
  readonly retryable: boolean; // client reads THIS to decide auto-retry
  readonly timedOut: boolean; // provenance marker (idle timeout vs other)
}
```

The client reads `retryable`. A fatal (non-retryable) failure keeps today's
behavior: terminal `done` with `error` set and `metadataJson: null` (or without
`retryable: true`) → no auto-retry, plain error state.

**Reducer/type surface the client reads** (task 4): `reduceStreamChunk` parses
the terminal chunk's `metadataJson`; when `retryable === true` it records the
messageId in a new `StreamState.retryableIds: ReadonlySet<string>` (parallel to
the existing `completedIds`). The reducer stays pure. The shared structural
`ChatStreamChunk` already carries `metadataJson`, so no new chunk field is
needed and **no GraphQL schema/codegen change is required** for the marker
(it rides existing `metadataJson`). Confirm during task 4.

## Decision 3 — Retry semantics (auto-once, then manual)

- **Auto-retry exactly once per turn.** Guard: a per-turn retry counter in
  `useAgenticChatTurn` keyed by the pending assistant message id (a ref/Map,
  reset on a new user submit, conversation restore, and `reset()`). After the
  single auto-retry is exhausted → stop auto-retrying, expose a manual-retry
  state that feeds the task 6 Retry button.
- **Two trip sources, two cancel policies:**
  1. **Server-emitted retryable terminal chunk** (the common case): the
     server-side turn has already terminated (it published the terminal), so
     **do NOT issue `intent=cancel`** — resubmit directly.
  2. **Client-side watchdog stall** (no terminal chunk arrived within the client
     window — e.g. the subscription silently died while the server turn may
     still be live): **issue `intent=cancel` first**, then resubmit, so we never
     leave an orphaned live turn on the server.
- **Client watchdog window:** `CLIENT_STALL_TIMEOUT_MS`, set _above_ the server
  backstop so the server's terminal chunk (path 1, faster + cleaner) is always
  preferred when it can arrive. Default is the `resolveChatIdleTimeoutMs`
  equivalent plus 30_000, i.e. **180_000 ms** as a client constant (the client
  can't read server env, so this is a plain constant tuned to sit above the 150s
  default). The watchdog exists only to cover a dead subscription; a live
  subscription always yields the terminal chunk first.
- **Last-activity signal (task 4):** `useConversationStream` timestamps each
  `onData` (`lastActivityAt = Date.now()`) and exposes it; `useAgenticChatTurn`'s
  watchdog reads it. The reducer stays pure — timestamping happens in the hook.
- **Session-resume idempotency:** on retry the client **resubmits as a fresh
  `intent=start` turn** with the same `(message, fields)`; the server resolves
  session/resume from conversation metadata exactly as any normal follow-up turn
  does (claude resumes its persisted session, HTTP re-sends full history). The
  client replay **does not add a duplicate user bubble** locally — it re-POSTs
  the stored `(message, fields)` and reuses the user message already in the
  thread. Partial output the orchestrator persisted on timeout is retained (it
  is real streamed content, not lost). Known, accepted v1 artifact: on a
  _persisted_ conversation a timed-out retry can leave a short partial assistant
  message plus a second user row server-side; given the conservative idle-only
  150s trigger this is rare, and a future refinement (reuse the assistant
  message id / suppress the duplicate user row server-side) is noted but out of
  scope here. **Private mode (persist=false) is inherently clean** — nothing is
  persisted, so the retry is a fresh ephemeral turn with no orphan.

## Decision 4 — Private mode + header/admin parity

- **Terminal chunk always emitted for Private turns.** The orchestrator's
  publish path is independent of `persist`; only the DB writes
  (`persistAssistant`, session metadata, model snapshot) are gated on
  `run.persist`. The timeout backstop therefore publishes its retryable terminal
  chunk for `persist=false` turns identically — only skipping the partial DB
  persist. Ephemeral turns recover exactly like persisted ones.
- **Header chat** wraps `useAgenticChatTurn` via `useHeaderChatController`, so it
  inherits the auto-retry/watchdog for free (task 7 verifies).
- **Admin app** has its own copy under
  `applications/openthrottle-admin/app/routes/resources.conversation-stream.tsx`
  plus its chat hooks; task 7 applies the equivalent behavior (prefer sharing
  the hook path; apply parity if it duplicates).

## Decided constants (referenced by downstream tasks)

| Constant / env                            | Value                                           | Where                        |
| ----------------------------------------- | ----------------------------------------------- | ---------------------------- |
| `OPENTHROTTLE_CHAT_IDLE_TIMEOUT_MS` (env) | unset → derived                                 | agentic-utils `teardown.ts`  |
| `DEFAULT_CHAT_IDLE_MARGIN_MS`             | `30_000`                                        | agentic-utils `teardown.ts`  |
| orchestrator idle default                 | `150_000` ms (120s + 30s)                       | server `runStream()`         |
| HTTP-backend idle                         | `resolveAgentTimeouts().idleMs` = `120_000`     | `chat-completions/stream.ts` |
| terminal metadata                         | `{ retryable: true, timedOut: true }`           | server → reducer             |
| reducer field                             | `StreamState.retryableIds: ReadonlySet<string>` | `conversation-stream.ts`     |
| `CLIENT_STALL_TIMEOUT_MS`                 | `180_000` ms                                    | `useAgenticChatTurn`         |
| auto-retry count                          | `1` per turn                                    | `useAgenticChatTurn`         |

## Task map

- **Task 2** — orchestrator idle backstop in `runStream()` using
  `resolveChatIdleTimeoutMs()`; race iterator `.next()` vs idle timer; on expiry
  `controller.abort()` + break + persist partial + publish retryable terminal.
- **Task 3** — HTTP/OpenAI backend per-chunk idle timeout using
  `resolveAgentTimeouts().idleMs`; compose the idle abort with the caller signal.
- **Task 4** — parse the retryable marker into `StreamState.retryableIds`; expose
  `lastActivityAt` from the stream hook.
- **Task 5** — auto-retry-once + stall watchdog in `useAgenticChatTurn`.
- **Task 6** — manual Retry affordance in shared `react-router-chat` UI.
- **Task 7** — header + admin parity; Private-mode recovery.
- **Task 8** — tests. **Task 9** — docs + validation.
