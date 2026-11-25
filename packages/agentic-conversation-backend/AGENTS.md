# @openthrottle/agentic-conversation-backend — agent notes

The uniform streaming seam behind the chat composer: a backend maps its source's native output (an
OpenAI-compatible HTTP endpoint, or a spawned agentic CLI) onto `ConversationStreamChunk`
(`text` | `thinking` | `tool_call` | `tool_result` | `usage` | `session`). Split out of
`@openthrottle/openthrottle-agentic-utils` (which no longer re-exports it).

**Consumed by:** `openthrottle-server` (chat streaming, agent discovery/setup), `@openthrottle/openthrottle-agentic-utils`
(plan-run transcript readers), `@openthrottle/agentic-hooks`, `@openthrottle/agentic-replay-testing`,
`@openthrottle/nestjs-repositories-server`. Must **not** depend on `agentic-utils` (cycle).

## Layout

Flat by the repo's "stay flat below the top level" rule — the per-CLI files are prefixed by their CLI.

- `src/utils/` — `<cli>.ts` (the backend), `<cli>-argv.ts`, `<cli>-events.ts` (+ per-CLI extras: `claude-auth-status`,
  `cursor-agent-mint`/`-teardown`, `opencode-mcp-config`, …) for claude, antigravity, codex, cursor-agent, grok, opencode;
  `acp*.ts` (ACP path); `registry.ts`; `openai.ts` + `streamChatCompletion.ts` (HTTP path); discovery, setup, handoff, keepalive.
- `src/types/` — `conversation-backend.ts` (chunk/backends contract), `agent-account.ts`.
- `src/data/copy.ts` — Claude auth-status copy.
- `src/index.ts` — the only barrel; it lists exactly the public symbols (per-CLI argv/event internals stay private, except the
  event mappers that plan-run transcript readers reuse).

## Adding a streaming backend

1. The driver already exists in `@openthrottle/openthrottle-drivers` (discovery derives from `ALL_DRIVERS`).
2. Add `<id>.ts`, `<id>-argv.ts`, `<id>-events.ts` mirroring an existing adapter (spawn hardening: allowlisted binary via bin-env,
   scrubbed env, arg-array/no-shell, SIGTERM→SIGKILL teardown, idle+wall timeouts).
3. Add one entry to `CONVERSATION_CLI_BACKENDS` in `registry.ts` — the ONE place a CLI backend is wired; the server derives its
   `CLI_BACKENDS` map from it.
4. Flip that driver's `capabilities.chatStreaming: true`. `__tests__/registry.test.ts` enforces 3 ⟺ 4.

Each CLI's native event schema is documented in `docs/openthrottle/<cli>-stream-json-schema.md`.

## ACP path (behind `OPENTHROTTLE_CHAT_ACP_BACKENDS`)

cursor and antigravity can run chat as one long-lived ACP agent per conversation. Per-agent launch facts and the
permission-posture → session-mode shim live in `acp-agent-specs.ts`, never in `acp.ts`. Cursor applies file edits without asking
in every mode, and `cursor-agent acp` runs no `.cursor/hooks.json` hooks, so chat-over-ACP on cursor carries no OT hook telemetry.

## Gotchas

- Every streaming path is idle-bounded via `resolveAgentTimeouts()` (`OPENTHROTTLE_AGENT_IDLE_TIMEOUT_MS`, default 120s); the HTTP
  backend (`streamChatCompletion.ts`) composes an internal `AbortController` with the caller's signal.
- Fixtures: `src/utils/__tests__/fixtures/`.

## Pointers

- [README.md](README.md) — human-facing overview.
- [../AGENTS.md](../AGENTS.md) — parent-tier conventions.
