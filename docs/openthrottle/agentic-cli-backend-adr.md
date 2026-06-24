# ADR: Agentic CLI conversation backends

> Plan-Id: a3363c74-09f5-4403-bca2-efc16ab424ed
> Status: Accepted · Date: 2026-06-19

## Context

The developer chat streamed completions from local OpenAI-compatible model
servers. We want it to also drive locally-installed **agentic CLIs**
(`cursor-agent` first; `claude`, `opencode` documented compatible) so the chat
can do real agentic work in a checkout — without rebuilding the streaming spine.

## Decision

**1. A `ConversationBackend` async-iterable seam.** A backend is
`(run) → AsyncIterable<ConversationStreamChunk>`. The OpenAI path and each CLI
adapter implement it; the service selects one and publishes the chunks. The seam
sits at "normalized run in, chunk iterable out" — everything CLI-specific
(parser, session acquisition, system-prompt injection) lives **inside** each
adapter. Validating against two real CLIs (cursor + claude) before locking the
interface confirmed this altitude: cursor emits flat top-level events with a
`timestamp_ms` delta discriminator and inline tool results; claude wraps the
Anthropic Messages API in `stream_event` envelopes with separate `user`
tool-result events. Neither shape leaks into the seam.

**2. A single flat `backend` discriminator** on the stream input:
`'openai' | 'cursor' | 'claude' | 'opencode'` (reusing `WorkflowConfigRunner`'s
values; only `cursor` wired in v1). `'openai'` requires baseUrl+modelId; CLI
values require a `repositoryId`. This mirrors the codebase's existing single-
`runner`-discriminator convention rather than nested per-backend input objects
(which code-first NestJS can't enforce anyway).

**3. A `kind` on the chunk** (`text | thinking | tool_call | tool_result |
usage | session`) defined once in `openthrottle-agentic-utils` and carried on
the wire. The OpenAI path emits `text` only; only `text` accumulates into the
persisted/rendered message. Adding `kind` now avoids a second breaking payload
change when richer tool/thinking rendering lands.

**4. Native session resume, not history replay.** One OT conversation ↔ one CLI
session (cursor: `create-chat` id persisted in `conversation.metadata`, resumed
each turn). The CLI owns multi-turn context; we send only the latest user
message. The session id is minted synchronously up front and persisted
immediately; the `kind:'session'` chunk is confirmation, not the source.

**5. Security gate** (highest-risk surface): allowlist-only spawning, arg-array
(no shell), scoped + ownership-checked cwd with a prod-disabled dev escape
hatch, scrubbed env, idle + wall-clock timeouts, and guaranteed SIGTERM→SIGKILL
teardown. See [agentic-cli-chat-backends.md](./agentic-cli-chat-backends.md).

## Consequences

- New CLIs are additive: vet with the compatibility guide, add an allowlist
  entry + an adapter; the seam/chunk/timeouts/teardown are shared.
- The chat persists text; tool/thinking/usage events stream but aren't rendered
  inline yet (deferred), and aren't yet persisted to message `tool_metadata`.

## v1 limitations (explicit)

- **In-process, fire-and-forget streaming over in-memory PubSub.** A run is tied
  to the node that started it; a restart drops in-flight streams. Fine for
  single-node dev.
- **Single-node, host cursor-login assumption.** The spawned CLI authenticates
  via the server host's own login; there is no per-OT-user credential mapping.
  Combined with the prod-disabled dev cwd, CLI backends are effectively a
  single-node/dev capability in v1.
- **Personas are a hardcoded map** (architect/builder/reviewer → system prompt);
  wiring to the real personas/agent-asset registry is deferred.

## Scale-out seam (when multi-node / durable execution is needed)

The two in-process assumptions have a documented path off:

- **Execution**: adopt the existing **BullMQ plans-processor** pattern — enqueue
  a stream job, run the spawn on a worker, so runs survive a web-node restart and
  spread across nodes (mirrors how Ralph plan runs already work).
- **Fan-out**: swap the in-memory PubSub for **Redis PubSub** at the existing
  seam in `packages/nestjs-graphql/src/pubsub/pubsub.module.ts`, so the
  `conversationStreamChunkAdded` subscription can be served by any node
  regardless of which one runs the job.

Neither is needed for v1; both are isolated changes behind interfaces that
already exist.
