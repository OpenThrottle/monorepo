# Agentic CLI backend compatibility guide

> A repeatable playbook for evaluating whether a locally-installed agentic CLI
> (e.g. `claude`, `opencode`, future tools) can serve as a **conversation
> backend** for the OpenThrottle developer chat, and for capturing the concrete
> facts an adapter needs. Run this against any candidate binary, fill in the
> [§12 template](#12-per-cli-findings-template), and produce a go/no-go verdict.

## 0. How to use this guide

1. Confirm the candidate binary is installed and authenticated.
2. Work through the probe sections [§2–§9](#2-probe-headless--structured-output) **in order** — later sections assume earlier facts. Each probe states _what to find out_, _why it matters_, and _how_ (a command).
3. Record every answer in the [§12 template](#12-per-cli-findings-template), pasting **verbatim** sample payloads (never paraphrased — the adapter parses real bytes).
4. Score against the [§11 rubric](#11-compatibility-rubric) → **Compatible / Compatible-with-degradation / Blocked**.
5. Commit the filled template as `docs/openthrottle/<cli>-stream-json-schema.md`.
   Completed contracts: [gemini](./gemini-stream-json-schema.md) (0.25.2 —
   source-derived event schema; refresh with live NDJSON once an authenticated
   host runs its §11 commands) and
   [antigravity](./antigravity-stream-json-schema.md) (1.1.21 — live capture).

> ⚠️ These probes invoke a **real agent** (network, tokens, and — without
> read-only flags — file/shell access). Always run in a **throwaway scratch
> directory** as the workspace, prefer the CLI's read-only mode for text-only
> probes, and only enable tool execution ([§5](#5-probe-tool-calls--thinking)) when
> deliberately capturing tool events.

## 1. The target contract (what "compatible" means)

A backend is, fundamentally, **an async iterable of chunks** produced from a
subprocess's stdout. The adapter must turn the CLI's output into the shared
`ConversationStreamChunk` shape (defined once in `openthrottle-agentic-utils`):

```
{ delta, done, error, kind, metadata? }
kind ∈ { text | thinking | tool_call | tool_result | usage | session }
```

Downstream (PubSub → `conversationStreamChunkAdded` → `useConversationStream` →
UI) is **unchanged**. So compatibility = "can we cleanly map this CLI's output
onto those chunks, spawn it safely, and drive multi-turn + cancel?"

**Required** for a v1 backend:

- A non-interactive/headless mode that streams to stdout and exits.
- Assistant text recoverable as a stream of deltas **or** a final full text.
- A deterministic terminal signal (a result event and/or process exit).
- Safe spawning: arg-array invocation (no shell), explicit cwd/workspace.
- Cancellation that actually kills the process.

**Nice-to-have** (degrade gracefully if absent):

- Incremental text deltas (else: render only on completion).
- Thinking / tool-call / usage events (else: text-only rendering).
- Native multi-turn session resume (else: flatten history into the prompt).
- A system-prompt mechanism (else: prompt-prefix; see [§6](#6-probe-system-prompt--persona)).

## 2. Probe: headless & structured output

**Find out:** Does it have a non-interactive/"print" mode? What output formats?
Is there a structured (JSON) format, and a partial/delta-streaming switch?

**Why:** Plain prettified TTY output is unparseable; we need a machine format.
Without delta streaming we can still ship (render on completion) but lose live
typing.

**How:**

```bash
<cli> --help            # look for: print/non-interactive, output-format, stream/partial flags
<cli> <subcmd> --help   # check relevant subcommands too
```

- cursor-agent ref: `--print` + `--output-format stream-json` + `--stream-partial-output`.
- Record the **exact** flag spelling and any "only valid with X" constraints.

## 3. Probe: framing & event taxonomy

**Find out:** Is structured output **NDJSON** (one JSON object per line) or some
other framing (SSE, length-prefixed, a single JSON doc)? Is it newline-
terminated? Does everything go to stdout? What is the set of event `type`s?

**Why:** Framing dictates the stream parser (line-buffered split vs SSE vs
incremental JSON). The type set is the source of the `kind` mapping.

**How:** run a trivial text prompt in a scratch workspace, capture raw:

```bash
SCRATCH=$(mktemp -d)
<cli> <headless+json flags> --workspace "$SCRATCH" <prompt "say hello"> > out.ndjson 2> out.err
echo "exit=$?"
tail -c 60 out.ndjson | xxd | tail -2          # framing: trailing 0a? one obj/line?
jq -r '.type' out.ndjson | sort | uniq -c       # event taxonomy (if NDJSON)
```

- cursor-agent ref: NDJSON, `\n`-terminated, all on stdout; types `system`,
  `user`, `thinking`, `tool_call`, `assistant`, `result`.
- If `jq` fails, the output isn't line-delimited JSON — document the real framing.

## 4. Probe: assistant text & the double-count trap

**Find out:** How is assistant text represented? As incremental deltas, a single
final blob, or **both**? If both, what distinguishes a delta from the final
echo? Where exactly is the text (JSON path)?

**Why:** This is the #1 adapter bug source. Some CLIs stream deltas **and** emit
a final consolidated message repeating the full text — naive accumulation
double-counts.

**How:** prompt for multi-token output and inspect every text-bearing event:

```bash
<cli> <flags> --workspace "$SCRATCH" "Count from 1 to 5, one per line." > out.ndjson
# adapt the jq path to the CLI's shape:
jq -rc 'select(.type=="assistant") | {marker: (has("timestamp_ms")), text: .message.content[0].text}' out.ndjson
# verify: does concatenating only the "delta-marked" events equal the final/result text?
```

- cursor-agent ref: deltas carry `timestamp_ms`; the final event **omits** it and
  repeats the full text. Rule: accumulate timestamped deltas, skip the echo
  (verified equal to `result.result`).
- **Record the exact discriminator** (a field's presence, a `subtype`, an
  `index`, etc.) and the canonical-final-text location.

## 5. Probe: tool calls & thinking

**Find out:** Are there reasoning/"thinking" events? Tool-call events? Is a tool
call one event or a started/completed pair? Is the **result inline** in the
completed event or a separate event? Is there a correlation id?

**Why:** Drives the `thinking` / `tool_call` / `tool_result` kind mapping and
how the UI correlates a call with its result.

**How:** enable tool execution (often a `--force`/`--yolo`/permission flag) in
the scratch dir and prompt for a file read:

```bash
printf 'hello\n' > "$SCRATCH/a.txt"
<cli> <flags + force/permission> --workspace "$SCRATCH" \
  "Use your tools to read a.txt and report its contents." > out.ndjson
jq -c 'select(.type|test("tool|thinking")) | {type, subtype, keys:(keys)}' out.ndjson | sort -u
```

- cursor-agent ref: `thinking` (subtype `delta` w/ top-level `text`, then
  `completed`); `tool_call` (subtype `started`, then `completed` with the result
  **embedded inline** at `tool_call.<kind>.result`); correlate by `call_id`. No
  separate `tool_result` type.
- Note whether headless tool use needs a trust/permission flag (see [§10](#10-spawning--safety-checklist)).

## 6. Probe: system prompt / persona

**Find out:** Is there a `--system`/instruction flag? If not, what's the
injection mechanism — prompt prefix, a rules/config file, a plugin dir?

**Why:** Persona → system prompt is CLI-only in v1. A flag is cleanest;
otherwise we prompt-prefix.

**How:** `grep` the help for `system`, `instruction`, `rule`, `append`, `prompt`.

- cursor-agent ref: **no** `--system` flag → prompt-prefix (rules files exist but
  would mutate the user's checkout, so avoided).
- **Rule:** prefer a real flag; never adopt a mechanism that writes into the
  user's repo. Fall back to prompt-prefix.

## 7. Probe: sessions & multi-turn

**Find out:** Can a session be created up front (returning an id)? Is there a
resume/continue flag? Does context persist across **separate process
invocations**? Where is the session id surfaced?

**Why:** Decides multi-turn strategy: native resume (preferred — persist one id
per OT conversation) vs flattening history into each prompt. Resume avoids
re-sending and lets the agent keep its own tool state.

**How:**

```bash
ID=$(<cli> create-session-cmd 2>/dev/null)        # if one exists; note exact output format
<cli> <flags> --resume "$ID" "Remember the word PURPLE."   > t1.ndjson
<cli> <flags> --resume "$ID" "What word did I just say?"   > t2.ndjson  # fresh process!
grep -i purple t2.ndjson && echo "CONTINUITY OK"
```

- cursor-agent ref: `create-chat` prints a bare UUID synchronously (use it,
  persist immediately); `--resume <id>` on every turn; continuity verified
  across processes; id echoed in `system/init`. Unknown id → fresh session, no
  hard error (graceful).
- **"Graceful" here is a trap — treat it as a hard requirement to validate the
  id at the mint.** cursor accepts _any_ string as a resume id: a never-minted
  UUID, and even the literal `Update available!  1.2.3` (spaces and all), both
  exit 0 and produce a full successful turn, echoing the junk back as
  `session_id`. So a banner byte that lands on stdout does not fail loudly — it
  silently starts a _disconnected_ chat and costs the conversation every prior
  turn, while the stream, the exit code, and the UI all report success. When
  probing a new CLI, deliberately resume a garbage id: if it does **not** error,
  your adapter must parse and validate the minted id rather than trusting
  `stdout.trim()` (see `cursor-agent/session-id.ts`).
- Also probe the _cold_ mint, not just a warm one. Note whether the create
  command touches the network or auth at all — cursor's does neither (it is
  `randomUUID()` plus a local SQLite write), which is what ruled out a whole
  class of suspected cold-start causes.
- **Bound the mint on the output you need, not on process exit.** This is the
  single most important lesson from the cursor cold-start bug: `create-chat`
  prints its id in ~2 s, but cold the process lingers past 30 s finishing
  startup work (statsig, MCP/OAuth, hooks) and holding its stdout pipe via a
  grandchild. An adapter that awaited `close` timed out and threw away an id it
  already had. Time **id-printed → process-exit** on a cold run; if there is a
  gap, resolve on the parse and tear the child down. A CLI that answers and then
  lingers is normal, not pathological.
- If no resume exists: document that v1 must flatten conversation history into
  the prompt (and the size/latency cost).

## 8. Probe: errors, exit codes, cancellation

**Find out:** Where do errors surface — a JSON event, or stderr + non-zero exit?
What's the terminal condition? Does the process exit cleanly on SIGTERM, and is
a SIGKILL escalation needed? Any zombies?

**Why:** The adapter's loop must terminate on _either_ a result event _or_
process exit, and map failures (including non-JSON ones) to an `error` chunk.
Cancel must guarantee teardown.

**How:**

```bash
<cli> <flags> --model "definitely-not-a-model" "hi"; echo "exit=$?"   # validation error path
<cli> <flags> --resume "00000000-0000-0000-0000-000000000000" "hi"; echo "exit=$?"  # bad id
# cancel: start a long prompt, kill the child, confirm no lingering process
```

- cursor-agent ref: config/validation errors → plain-text **stderr** + exit 1,
  **no** JSON; success ends with a `result` event (`is_error`, `usage`). So:
  terminal = `result` **or** process exit; on exit-without-result, surface
  buffered stderr.
- **Capture the exact strings — they are the only basis for actionable copy.**
  cursor's two auth failures are
  `Error: Authentication required. Please run 'agent login' first, …` and an
  **ANSI-wrapped** `⚠ Warning: The provided API key is invalid.`; keychain
  failures surface osStatus 36 (`errSecInteractionNotAllowed`) / 44
  (`errSecItemNotFound`). Strip ANSI before this text reaches a UI — escapes on
  stderr are the norm, not the exception.
- **Check for grandchildren, and whether the process actually exits.** cursor
  spawns a long-lived `worker-server` that inherits the parent's stdout pipe and
  outlives the run (observed alive minutes later). Two consequences for any
  adapter: a `for await` over `child.stdout` can never end on EOF, and a
  `child.kill()` that signals only the direct child leaks a process per turn.
  Spawn `detached: true` and tear down by process group. Verify with `ps` after
  a turn completes, and time result-event → `close` on a cold run as well as a
  warm one — cursor's gap is ~3 s warm and has been observed at 4+ minutes cold.
- Record exact exit codes and whether errors ever appear as stream events.

## 9. Probe: auth, models, discovery

**Find out:** How does the binary authenticate (interactive login vs API-key env
var)? Is there a `--version`, a `status`/`whoami`, a `--list-models`/`models`?

**Why:** Discovery (allowlist + probe) uses `--version`/availability; auth model
determines the single-node assumption (host login) and what env the child needs.

**How:** `<cli> --version`; `<cli> status` (or `whoami`/`about`); `<cli> --list-models`.

- cursor-agent ref: host login (`apiKeySource: "login"`), `status` shows the
  account, `models`/`--list-models` enumerate ids, `--version` for probing.

## 10. Spawning & safety checklist (applies to every CLI)

These are **invariant** regardless of CLI — verify the adapter honors them:

- [ ] Spawn via **arg array**, never a shell string / `shell:true`. The prompt is
      one array element; shell metacharacters must not escape (add a test).
- [ ] **Scrubbed env** (PATH, HOME, TERM + the CLI's own auth vars only) — never
      the server's full `process.env` (DB/JWT/Redis secrets).
- [ ] cwd is a **server-validated** path (owned checkout in prod; dev escape hatch
      env-gated, disabled in prod). Pass it via both spawn `cwd` and any
      `--workspace`-style flag.
- [ ] Any headless **trust/permission** flag the CLI requires is passed explicitly.
- [ ] Idle + wall-clock **timeouts**; teardown = SIGTERM→SIGKILL grace + reap.
- [ ] AbortSignal → `child.kill()`; the iterable terminates on process exit.

## 11. Compatibility rubric

| Verdict                   | Criteria                                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Compatible**            | Headless structured output + recoverable assistant text + deterministic terminal + safe arg-array spawn + working cancel. Bonus events/sessions present.                                                                       |
| **Compatible (degraded)** | Required items met, but missing deltas (render-on-complete), and/or no native sessions (flatten history), and/or no system flag (prompt-prefix), and/or no tool/thinking events (text-only). Ship with documented limitations. |
| **Blocked**               | No machine-readable output, OR can't run headless, OR can't be spawned without a shell, OR no reliable terminal/cancel. Do not add to the allowlist.                                                                           |

Map the findings to the chunk contract before declaring a verdict:

| CLI event/condition  | → chunk          | Fill in per CLI                                |
| -------------------- | ---------------- | ---------------------------------------------- |
| assistant text delta | `text` (`delta`) | path: **\_ ; delta-vs-final discriminator: _** |
| reasoning/thinking   | `thinking`       | path: \_\_\_                                   |
| tool invocation      | `tool_call`      | correlation id: \_\_\_                         |
| tool result          | `tool_result`    | inline or separate event: \_\_\_               |
| token accounting     | `usage`          | path: \_\_\_                                   |
| session id surfaced  | `session`        | source (create cmd vs event): \_\_\_           |
| completion           | `done:true`      | terminal signal: \_\_\_                        |
| failure              | `error`          | stderr vs JSON; exit codes: \_\_\_             |

## 12. Per-CLI findings template

Copy into `docs/openthrottle/<cli>-stream-json-schema.md` and fill from the probes:

```markdown
# <cli> stream-json schema

> **Measured <YYYY-MM-DD>** on <cli> version <X>, auth: <login|api-key>.
> Re-verify on every <cli> release.

## 1. Invocation contract

<exact headless + json + partial flags, cwd/workspace flag, trust/permission flags, with a one-line table of each + meaning>

## 2. Framing & event taxonomy

<NDJSON? terminator? stdout-only? list of event types with one verbatim sample each>

## 3. Assistant text & double-count rule

<delta vs final discriminator (verbatim), JSON path to text, canonical final text location, verification that delta-concat == final>

## 4. Thinking & tool calls

<verbatim samples; started/completed; inline-vs-separate result; correlation id>

## 5. System prompt / persona

<flag or prompt-prefix; explicitly note anything that would mutate the checkout and is therefore rejected>

## 6. Sessions & multi-turn

<create cmd + output format; resume flag; cross-process continuity result; where the id is surfaced; unknown-id behavior>

## 7. Errors, exit codes, cancellation

<table: scenario | stdout | stderr | exit | handling; terminal condition; SIGTERM/SIGKILL behavior>

## 8. Auth, models, discovery

<auth model; --version; status/whoami; --list-models output>

## 9. Event → ConversationStreamChunk mapping

<the §11 table, filled>

## 10. Verdict

<Compatible | Compatible (degraded, with the specific limitations) | Blocked, with reasons>

## 11. How to reproduce

<the exact commands used, so the capture can be refreshed on a version bump>
```
