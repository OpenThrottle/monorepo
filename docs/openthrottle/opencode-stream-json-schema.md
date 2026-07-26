# opencode (OpenCode) stream-json schema (spike)

> Plan-Id: 263b1ed7-ff71-4bdf-855b-4c3ea0656e4e
>
> Filled-in output of [agentic-cli-backend-compatibility-guide.md](./agentic-cli-backend-compatibility-guide.md)
> for the `opencode` CLI. Compare with
> [cursor-agent-stream-json-schema.md](./cursor-agent-stream-json-schema.md) and
> [claude-stream-json-schema.md](./claude-stream-json-schema.md). All payloads are
> verbatim from live runs on **opencode `1.18.5`** using the credential-free
> `opencode/*-free` zen models. Re-run the commands in [§11](#11-how-to-reproduce)
> to refresh.

## 1. Invocation contract

```
opencode run --format json --dir <cwd> [-s <sessionID>] [-m <provider/model>] \
  [--agent <name>] -- "<prompt>"   < /dev/null
```

| Flag                 | Meaning for the adapter                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `run [message..]`    | Headless single-turn run. The prompt is the positional `message`. **Required** subcommand.                                      |
| `--format json`      | Raw JSON event stream (this doc). `default` is human-formatted text. **Required** for parsing.                                  |
| `--dir <cwd>`        | Directory to run in. We also set the spawn `cwd`; passing `--dir` explicitly is belt-and-suspenders. There is no `--workspace`. |
| `-s, --session <id>` | Continue an existing session by id (see [§6](#6-sessions--multi-turn)). Omit on the first turn to mint a new session.           |
| `-c, --continue`     | Continue the most recent session in the cwd. We resume by explicit id instead, never `-c`.                                      |
| `--fork`             | Branch the session when continuing. Unused.                                                                                     |
| `-m, --model <p/m>`  | Model as `provider/model` (e.g. `opencode/nemotron-3-ultra-free`). Omitted → opencode's configured default.                     |
| `--agent <name>`     | Named agent config. Unused in v1 (persona is injected as a prompt prefix — see [§5](#5-system-prompt--persona)).                |
| `--variant <effort>` | Provider-specific reasoning effort (`high`/`max`/`minimal`). Not wired in v1.                                                   |
| `--print-logs`       | Send logs to stderr. **Do NOT pass** — we want clean JSON on stdout; logs stay off stdout by default.                           |

**Spawn gotchas (verified, all matter for the adapter):**

- **Terminate options with `--` before the prompt.** Persona system prompts are
  skill markdown that often starts with YAML frontmatter (`---`), which yargs
  would otherwise treat as an option. `opencode run -- "<prompt>"` is verified to
  pass the prompt through untouched (same posture as cursor-agent).
- **Ignore stdin** (`stdio: ['ignore', …]`) — the run is fully driven by argv.
- **No pre-mint command.** `opencode session` only exposes `list`/`delete`; there
  is no "create-chat" equivalent. The session id is **minted by the first `run`**
  and surfaced in the stream (see [§6](#6-sessions--multi-turn)).

## 2. Framing & event taxonomy

- **NDJSON**, one object per line, on stdout. Every event carries a top-level
  `type`, a `timestamp`, a top-level `sessionID`, and a `part` object.
- Outer envelope `type`s observed for a plain text turn: `step_start`, `text`,
  `step_finish`. (Tool turns additionally emit `tool` parts — `.part.type` ∈
  `step-start | text | tool | step-finish`.)
- Unlike claude, deltas are **not** nested under an Anthropic envelope; each event
  is a flat opencode "part" snapshot.

### `step_start` — turn/step opened

```json
{
  "type": "step_start",
  "timestamp": 1785038644951,
  "sessionID": "ses_06367…",
  "part": {
    "id": "prt_…",
    "messageID": "msg_…",
    "sessionID": "ses_06367…",
    "type": "step-start"
  }
}
```

> The adapter reads `sessionID` here (first event) to surface the minted session
> id as a `kind:'session'` chunk. No text mapping.

### `text` — assistant text (part **snapshot**, not a delta)

```json
{"type":"text","timestamp":…,"sessionID":"ses_…","part":{"id":"prt_…","messageID":"msg_…","type":"text","text":"1\n2\n3\n4\n5","time":{"start":…,"end":…}}}
```

> ⚠️ **Snapshot rule:** `.part.text` is the **full accumulated text of that
> part**, keyed by `.part.id` — NOT an incremental delta. Fast models emit one
> `text` event with the whole answer; a streaming model emits several `text`
> events **sharing the same `part.id`**, each carrying the growing full text. The
> adapter therefore tracks the last emitted length **per `part.id`** and emits only
> the newly-appended suffix as the chunk `delta`. (This is the per-CLI
> double-count discriminator the guide asks for: cursor used `timestamp_ms`
> presence, claude the envelope type, opencode uses **part-id snapshot growth**.)

### `tool` — tool call + result (same part, updated by state)

A `tool` part carries `.part.tool` (name), `.part.callID`, and `.part.state`
(`.status` ∈ `pending | running | completed | error`, with `input`/`output`).
Mapped to `kind:'tool_call'` while running and `kind:'tool_result'` on
`completed`/`error`, correlated by `callID`. The raw `part` is passed through as
metadata. (Not exercised by the credential-free zen models used for the text
capture; shape confirmed from `opencode` docs + `--format json` schema.)

### `step_finish` — step terminal (usage/cost)

```json
{"type":"step_finish","timestamp":…,"sessionID":"ses_…","part":{"type":"step-finish","reason":"stop","tokens":{"total":7898,"input":7255,"output":3,"reasoning":0,"cache":{"write":0,"read":640}},"cost":0}}
```

> `step_finish` carries `tokens` + `cost` → a `kind:'usage'` chunk. It marks the
> end of a step; **process exit** (clean, exit 0) is the terminal condition for the
> turn — opencode does not emit a single distinguished "result" event the way
> cursor/claude do. On exit, the adapter emits the terminal `done:true` chunk.

## 3. Assistant text & double-count rule

- Canonical text: `type:"text"` → `.part.text`, de-duplicated per `.part.id` by
  emitting only the suffix beyond the previously-seen length for that part.
- There is no separate consolidated echo to skip (unlike cursor/claude); the
  per-part snapshot dedupe **is** the double-count guard.

## 4. Thinking & tool calls

- **Thinking:** shown only with `--thinking`; arrives as `reasoning`/thinking
  parts. Not enabled in v1 (kept off for clean text streaming).
- **Tool call/result:** a `tool` part transitions `pending → running → completed`;
  `state.input` holds args, `state.output` the result. `kind:'tool_call'` on
  running, `kind:'tool_result'` on completed, correlated by `callID`.

## 5. System prompt / persona

opencode has **no `--system-prompt`/`--append-system-prompt` flag** (only named
`--agent` configs). Persona is therefore injected as a **prompt prefix**
(`<persona>\n\n<latest user message>`), the same degradation cursor uses — and the
reason the `--` terminator matters. Wiring personas to real `--agent` configs is a
future improvement, not required for v1.

## 6. Sessions & multi-turn

- **Minted by the first run**, not supplied by us: `opencode run` with no `-s`
  creates a session and echoes its id as the top-level `sessionID` on every event
  (`ses_…`, opencode's own opaque id — **not** a UUID we control).
- The adapter surfaces the minted id via a `kind:'session'` chunk; the
  `ConversationStreamService` persists it to `conversation.metadata.opencodeSessionId`.
- `-s <sessionID>`: resume. **Continuity verified across separate process
  invocations** — turn 2 (`-s <minted>`) recalled the secret word set in turn 1.
  opencode owns multi-turn context; do **not** replay history.
- Contrast: cursor pre-mints via `create-chat` (round-trip in the resolver);
  claude uses a UUID **we** supply (`--session-id`); opencode discovers the id
  **from the first turn's stream** and persists it after.

## 7. Errors, exit codes, cancellation

| Scenario                    | stdout                                    | exit  | Handling                                                                           |
| --------------------------- | ----------------------------------------- | ----- | ---------------------------------------------------------------------------------- |
| Normal completion           | NDJSON ending in `step_finish`, then EOF  | **0** | Process exit (0) with a seen `step_finish` → `done:true`.                          |
| Unknown/unauthed model      | error on stderr, little/no JSON on stdout | ≠0    | Non-zero exit with no terminal text → surface buffered stderr as an `error` chunk. |
| `tool` part `state:"error"` | JSON stream continues                     | 0     | Emit a `tool_result` chunk with the error payload; not fatal.                      |

**Terminal condition:** **process exit** (opencode has no single "result" event).
A clean exit (0) after a `step_finish` → terminal `done:true` chunk; a non-zero
exit without streamed text → terminal `error` chunk from buffered stderr.
Cancellation: SIGTERM the child (shared teardown) — same as cursor/claude.

## 8. Auth, models, discovery

- Auth: `opencode auth`/provider credentials in `~/.local/share/opencode/auth.json`;
  the `opencode/*-free` zen models need **no credentials** (used for this spike).
- `opencode --version` → `1.18.5` (probe/availability — clean single-line stdout,
  exit 0).
- `opencode models` lists `provider/model` ids; `-m` selects.

## 9. Event → ConversationStreamChunk mapping

| opencode event/condition                               | → chunk       | Path / note                                                         |
| ------------------------------------------------------ | ------------- | ------------------------------------------------------------------- |
| `step_start` (first event, has `sessionID`)            | `session`     | `metadata.sessionId = .sessionID` (minted id)                       |
| `text` (per `part.id` snapshot)                        | `text`        | `delta` = `.part.text` suffix beyond last-seen length for `part.id` |
| `tool` (`state.status=="running"`)                     | `tool_call`   | `metadata.callId = .part.callID`; raw part passthrough              |
| `tool` (`state.status` ∈ `completed`\|`error`)         | `tool_result` | correlate by `callID`; `error` when state is `error`                |
| `step_finish`                                          | `usage`       | `metadata.tokens`, `metadata.cost`                                  |
| process exit 0 (terminal)                              | `done:true`   | opencode has no discrete result event                               |
| process exit ≠0 without streamed text / startup stderr | `error`       | surface buffered stderr                                             |

## 10. Verdict — **Compatible**

opencode satisfies every **required** criterion:

- ✅ Headless single-turn `run --format json` NDJSON stream on stdout.
- ✅ Native cross-process session resume (`-s <id>`), continuity verified.
- ✅ Deterministic text (per-part snapshot; dedupe by part-id suffix).
- ✅ `--` prompt terminator (persona-frontmatter safe), clean `--version` probe.

**Adapter differences from cursor/claude (per-adapter, not interface-level):**

1. Text arrives as a **per-part snapshot** (`.part.text` = full text for that
   `part.id`), so the parser emits the **suffix** — vs cursor/claude append-only
   deltas.
2. **No result event** — the terminal condition is **process exit**, not a `result`
   line (cursor/claude both emit one).
3. Session id is **discovered from the first turn's stream** and persisted after —
   vs cursor's pre-mint and claude's caller-supplied UUID.
4. **No system-prompt flag** — persona is a prompt prefix (like cursor), not a
   first-class flag (like claude).

All fit the shared `ConversationBackend` seam; only parsing + invocation + session
acquisition differ per CLI. No required degradations beyond persona-as-prefix.

## 11. How to reproduce

```bash
SCRATCH=$(mktemp -d); cd "$SCRATCH"

# turn 1 (text) — mint a session; note: ignore stdin, -- before prompt
opencode run --format json -m opencode/nemotron-3-ultra-free --dir "$SCRATCH" \
  -- "Remember the secret word: pineapple. Reply ok." < /dev/null > t1.json
SID=$(jq -rc 'select(.sessionID) | .sessionID' t1.json | head -1)

# turn 2 — resume (continuity, fresh process)
opencode run --format json -m opencode/nemotron-3-ultra-free --dir "$SCRATCH" \
  -s "$SID" -- "What was the secret word?" < /dev/null > t2.json
```

Inspect:

```bash
jq -r '.type' t1.json | sort | uniq -c
jq -rc 'select(.type=="text") | [.part.id, .part.text] | @json' t1.json
jq -rc 'select(.sessionID) | .sessionID' t1.json | head -1
```
