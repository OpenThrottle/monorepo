# @openthrottle/agentic-replay-testing

Record real agent-CLI sessions as sanitized NDJSON transcripts, then replay them through the
production code paths. When a CLI upgrade changes its stream-json shape, or an argv builder
changes what it sends, a test fails instead of production.

## What a transcript is

One recorded spawn of an agent CLI, one JSON object per line:

| Line                 | Meaning                                                    |
| -------------------- | ---------------------------------------------------------- |
| `header`             | backend, CLI version, scenario, model, surface, recordedAt |
| `outbound` / `argv`  | the argv the CLI received — asserted strictly on replay    |
| `outbound` / `stdin` | what was written to stdin (omitted when empty)             |
| `inbound` / `stdout` | one raw stdout line, emitted verbatim on replay            |
| `inbound` / `stderr` | stderr (omitted when empty)                                |
| `exit`               | exit code and signal                                       |

Paths, emails, tokens and account config are stripped before a transcript is written; UUIDs are
mapped to deterministic placeholders (`placeholderUuid(1)`, …) in order of first appearance.

## Recording

```bash
pnpm nx run agentic-replay-testing:record -- --backend claude
pnpm nx run agentic-replay-testing:record -- --backend claude --scenario resume,error
```

Recording drives the **production** conversation backend with its `*_BIN` override pointed at a
generated recording shim. The backend builds the argv, scrubs the env and spawns exactly as in
production; the shim runs the real CLI underneath and captures the traffic. Nothing rebuilds an
argv, so a recorded argv is by construction what production sends.

It spends real tokens on the logged-in account. Every transcript is sanitized and leak-checked
before it is written to `fixtures/<backend>/`, and a scenario that expects a write to be denied
fails the recording if the file appears.

The shared scenarios (`src/data/data.scenarios.ts`) are recorded by every backend: `accept-edits`,
`error`, `interrupt`, `multi-tool`, `permission-denied`, `resume` (two turns), `simple-turn`,
`system-prompt`, `thinking`, `tool-use`. A claude `rate_limit_event` (status `allowed`) arrives on
every turn, so each claude transcript carries one; a real rejection cannot be provoked on demand.

## Backends recorded

| Backend     | Session                          | Conversation | Plan run | Gaps                                                                 |
| ----------- | -------------------------------- | ------------ | -------- | -------------------------------------------------------------------- |
| claude      | caller UUID                      | 11           | 3        | —                                                                    |
| codex       | CLI-minted thread id             | 11           | 3        | `resume.turn-2` pins a known bug (`exec resume` rejects `--sandbox`) |
| cursor      | caller, pre-minted `create-chat` | 10           | 3        | no `permission-denied`: supervised let the write through             |
| opencode    | CLI-minted `ses_…`               | 10           | 0        | no `permission-denied` (same); plan-run model gated on the account   |
| antigravity | CLI-minted conversation id       | 11           | 3        | —                                                                    |

Session strategy (`sessionStrategy` on each profile) decides what a resume turn continues. Every
turn carries the full history, and a later turn's replay first replays the earlier turns, each
strictly verified, to rebuild the history and any CLI-minted session id. One sanitizer covers a
whole scenario so an id maps to the same placeholder in every turn.

## Replaying

```ts
import {
  CLAUDE_RECORDING_PROFILE,
  replayFixture,
  replayFixturePath,
} from '@openthrottle/agentic-replay-testing';

const { chunks, report } = await replayFixture({
  fixturePath: replayFixturePath('claude', 'simple-turn'),
  profile: CLAUDE_RECORDING_PROFILE,
});
expect(report).toEqual({ ok: true });
```

`replayFixture` rebuilds the run the transcript's scenario turn describes and installs a replay bin
as the backend's `*_BIN`. The bin normalizes this machine's paths the way the recorder did, then
compares the argv (and any stdin) **strictly**. On a mismatch it exits `97` with a diff on stderr
and streams nothing, so an argv-builder change fails the test rather than quietly replaying stale
output. On a match it emits the recorded stdout and stderr with timing collapsed and exits as the CLI
did. When the CLI was terminated (exit 130/143 or a signal), it waits for the backend's signal first.

Every run writes a `ReplayReport`. A `null` report means the bin never ran, i.e. the backend did not
spawn through its override. For a lower-level seam, `installReplayBin(path)` returns the bin path
and `readReport`.

## Plan runs (the Ralph engine)

Plan-run scenarios (`plan-run-complete`, `plan-run-error`, `plan-run-no-marker`, in
`src/data/data.plan-run-scenarios.ts`) are recorded and replayed through the **real Ralph
orchestrator** (`createWorkflowRalphOrchestrator`) with an iteration runner on the production
drivers engine (`runDriverAsync` + `withStructuredOutput`) — the same path `runIterationAsync`
takes. The only stand-ins are OpenThrottle (a stateful in-memory store of the seven GraphQL
operations the orchestrator performs) and the agent process.

The drivers engine spawns `claude -p …` through a shell and never reads `OPENTHROTTLE_CLAUDE_BIN`,
so the shim or replay bin is installed as a bare `claude` first on `PATH`. Plan and task ids are
placeholder UUIDs from the start, and timestamps are fixed, so the orchestrator's prompt is
byte-identical between recording and replay; the prompt also names the OpenThrottle checkout,
tokenized as `<OT_ROOT>`.

```ts
const result = await replayPlanRun(replayFixturePath('claude', 'plan-run-complete'));
expect(result.store.statusChanges()).toEqual([...]);
```

## Drift check (scheduled re-recording)

```bash
pnpm nx run agentic-replay-testing:check-drift
pnpm nx run agentic-replay-testing:check-drift -- --backend codex,cursor --json drift.json
```

Re-records every scenario against the installed CLIs into a temp directory, and never into
`fixtures/`. It compares each fresh transcript with the committed one structurally: argv and stdin
exactly, stdout as a **set of event shapes** (`type`/`subtype`/`event` plus a nested `type`), and
the exit class. Model wording, delta counts and ids are ignored. It exits 1 on drift.

[`Job_ReplayDrift`](../../.agents/prompts/Job_ReplayDrift.md) runs it weekly as an OpenThrottle
scheduled agent job and files one OT plan with what drifted. Same-version, shape-only findings are
usually model variance (a different tool choice), so the job re-runs before it trusts one. Refreshing
a transcript is always a deliberate `record` run reviewed in a PR.

## Testing

```bash
pnpm nx run agentic-replay-testing:test
```
