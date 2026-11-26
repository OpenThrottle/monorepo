# Claude Code transcript and Stop-payload fixtures

Sanitized from real local Claude Code 2.1.309 sessions on 2026-10-29 (OT plan
`e7b74d81`, task `a162b976`). All message text, thinking and tool input/output is
replaced with `[redacted]`; session ids, `cwd` and branch names are replaced.
Structure, record types, request ids, models and `message.usage` are kept
verbatim, because those are what the transcript reader depends on.

## `transcript.jsonl`

| Lines | What it pins down                                                                                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | A `user` line: no `message.usage`, never a token row.                                                                                                                                                      |
| 2–5   | ONE request (`requestId` `req_011CgX363…`) fanned out over four `assistant` lines, one per content block, each carrying the SAME `usage`. Counting lines instead of unique request ids would quadruple it. |
| 6–8   | A second request, three lines, for dedupe across requests.                                                                                                                                                 |
| 9     | A `<synthetic>` assistant line (an auth failure): no `requestId`, all-zero usage. Not an API request; never a token row.                                                                                   |
| 10    | A line truncated mid-write. A reader must skip it and must not advance its offset past it.                                                                                                                 |

## `subagent-transcript.jsonl`

Two `assistant` lines from a subagent's own transcript (`<session>/subagents/agent-<id>.jsonl`):
`isSidechain: true`, an `agentId`, and their own request id. Subagent usage lives
in these files, not in the main transcript.

## `stop-payload.json`, `subagent-stop-payload.json`

Field names and value shapes match the installed 2.1.309 Stop/SubagentStop hook
input, and the identifiers and path layout are those of a real session and its
subagent on disk. They were assembled rather than captured from hook stdin,
because capturing stdin needs a temporary hook in a live session's settings.
Replace them with captured stdin when the live end-to-end check (task
`03f9e0b3`) records one.

## What the transcript does NOT carry

- **Cost.** No `cost` field exists on any line; `cost_usd` for Claude Code rows
  is NULL unless priced server-side.
- Per-request wall time: only line timestamps.
