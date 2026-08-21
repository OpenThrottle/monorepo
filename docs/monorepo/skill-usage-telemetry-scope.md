# Skill-usage telemetry: what is captured, what is not

**Status:** authoritative scope note for `skill_usage_events` / `skill_usage_outcomes`.
**Baseline snapshot:** 2026-08-20 (263 events, 2026-07-31 → 2026-08-20).

This page exists because a "0 invocations" reading is routinely mistaken for
"nobody uses this skill". It is not the same claim. Read this before deleting a
skill on usage grounds.

## Where the rows come from

Authoring lives in [`packages/agentic-hooks`](../../packages/agentic-hooks); the
`.claude/hooks/*.cjs` and `.cursor/hooks/*.cjs` files are generated bundles
(`pnpm nx run @openthrottle/agentic-hooks:bundle-hooks`). Do not edit the bundles.

| Hook                               | Registered as                         | Emits                                                                        |
| ---------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------- |
| `skill-usage-capture.cjs`          | Claude `PreToolUse` (matcher `Skill`) | one event, `invocation_path='skill_tool'`                                    |
| `skill-usage-capture.cjs`          | Claude `UserPromptExpansion`          | one event, `invocation_path='slash'`                                         |
| `skill-usage-complete.cjs`         | Claude `Stop`                         | resolves open starts → `success` outcomes; sweeps stale starts → `abandoned` |
| `skill-usage-capture.cjs` (cursor) | Cursor `beforeSubmitPrompt`           | one event, `source='cursor'`                                                 |

Every write is fail-open: POST to OT GraphQL first, append to
`.cache/skill-usage/{events,outcomes}.jsonl` on any failure, drained
opportunistically later. `.cache/skill-usage/starts/` is **not** a buffer — it is
the per-session open-start correlation ledger, drained on `Stop`. Files sitting
there mean sessions are in flight, not that the drain is broken.

As of the baseline snapshot neither `events.jsonl` nor `outcomes.jsonl` exists in
any checkout, i.e. every recorded event reached the server directly. The drain
path is healthy.

## Captured

- A model calling the `Skill` tool in the **main loop** of Claude Code.
- A human typing `/<skill-name>` in Claude Code.
- A human typing `/<skill-name>` in Cursor.

## NOT captured — the blind spots

1. **Skills reached without the `Skill` tool.** A model that reads a `SKILL.md`
   as reference material, or follows guidance already injected into its context,
   produces no row. This is the largest gap and it is structural: there is no
   hook for "the model read a file and complied".

2. **Skills injected into `Workflow` / `Agent` subagent prompts.** The
   `agent_id` / `agent_type` columns exist and `normalizeClaudePayload` reads
   them when present — but Claude Code's `PreToolUse` payload does not carry
   agent identity, so **0 of 263 rows have either column populated**. Subagent
   activity is therefore either absent or silently merged into the parent
   session. Nothing downstream can currently distinguish the two.

3. **Cursor beyond slash commands.** Cursor is wired to `beforeSubmitPrompt`
   only, which sees human-typed prompts. There is no Cursor equivalent of
   `PreToolUse`, so a Cursor model invoking a skill is invisible. Exactly **1**
   `source='cursor'` row exists in the entire dataset — that is the ceiling of
   what this wiring can see, not a measure of Cursor usage.

4. **Codex / OpenCode / other harnesses under `.agents/`.** No adapter exists.
   Zero rows, by construction.

5. **Five legacy rows** predate the `source` stamp (`source IS NULL`).

### Exhibit A

`improve` shows **0 events** yet demonstrably drove the 51-plan `ot-improve`
remediation fleet. It was consumed as reference material by subagents — blind
spots 1 and 2 together. Any skill whose consumers are subagents or
read-as-reference will read as 0 forever.

## How to read a 0

> **`0` means "0 recorded `Skill`-tool or slash invocations in Claude Code (plus
> Cursor slash commands)". It does not mean unused.**

A 0 is **trustworthy** for a skill that can only be reached one way:

- `disable-model-invocation: true` skills — slash is the only entrypoint, and
  slash is captured. A 0 here is a real 0.
- Skills a human would type or not at all.

A 0 is **untrustworthy** for:

- Reference/guidance skills a model reads rather than invokes.
- Anything designed to be consumed by subagents or fleet runners.

Cut on a trustworthy 0 or on a structural argument (duplication, contradiction
with `CLAUDE.md`). Do not cut a reference skill on an untrustworthy 0 alone.

## Corrected baseline — invocations

15 of 44 skills have ever fired. `grilling` (1, 2026-08-19) and `graphify` (1,
2026-08-17) were 0 in the original plan snapshot and are no longer 0.

| skill                 | invocations | sessions | paths              | last used              |
| --------------------- | ----------- | -------- | ------------------ | ---------------------- |
| `ot-claude-loop`      | 74          | 73       | slash              | 2026-08-20             |
| `github-squash`       | 61          | 59       | skill_tool + slash | 2026-08-20             |
| `github-pull-request` | 44          | 43       | skill_tool + slash | 2026-08-20             |
| `ot-plan-loop`        | 27          | 26       | slash              | **2026-08-14 (stale)** |
| `loop` (built-in)     | 24          | 12       | skill_tool + slash | 2026-08-13             |
| `github-commit`       | 12          | 12       | slash              | 2026-08-16             |
| `ot-plans`            | 10          | 10       | skill_tool         | 2026-08-15             |
| `skill-sync`          | 3           | 3        | skill_tool + slash | 2026-08-14             |
| `git-commit`          | 2           | 2        | skill_tool         | 2026-08-07             |
| `grilling`            | 1           | 1        | skill_tool         | 2026-08-19             |
| `graphify`            | 1           | 1        | skill_tool         | 2026-08-17             |
| `claude-api`          | 1           | 1        | slash              | 2026-08-13             |
| `agents-ralph`        | 1           | 1        | skill_tool         | 2026-08-11             |
| `monitor-ci`          | 1           | 1        | skill_tool         | 2026-08-16             |
| `ot-onboarding`       | 1           | 1        | slash              | 2026-08-14             |

By path: 222 slash, 35 `skill_tool` (claude-code), 4 `skill_tool` (legacy null
source), 1 cursor, 1 unclassified legacy.

## Corrected baseline — outcomes

| skill                 | success | abandoned | error | avg duration   |
| --------------------- | ------- | --------- | ----- | -------------- |
| `ot-claude-loop`      | 65      | **5**     | 0     | 2880s (48 min) |
| `github-squash`       | 52      | **3**     | 0     | 141s           |
| `github-pull-request` | 37      | 0         | 0     | 144s           |
| `loop`                | 18      | 1         | 0     | 899s           |
| `ot-plan-loop`        | 18      | 0         | 0     | 1849s          |
| `github-commit`       | 8       | 1         | 0     | 116s           |
| `ot-plans`            | 3       | 0         | 0     | 223s           |
| `skill-sync`          | 1       | **1**     | 0     | 34s            |
| `grilling`            | 1       | 0         | 0     | 312s           |
| `agents-ralph`        | 1       | 0         | 0     | 617s           |
| `graphify`            | 1       | 0         | 0     | 92s            |
| `claude-api`          | 1       | 0         | 0     | 26s            |
| `monitor-ci`          | 1       | 0         | 0     | 1233s          |
| `ot-onboarding`       | 1       | 0         | 0     | 24s            |

`abandoned` rows carry no `duration_ms` (the sweep cannot know how far in a run
died), so `avg duration` is a success-only average.

**Vocabulary caveat:** `abandoned` is emitted by the stale-start sweep for any
open start whose session ended without a `Stop`-resolved completion. It is not a
defect rate — see [What `abandoned` actually means](#what-abandoned-actually-means)
for the per-row classification.

## What `abandoned` actually means

All 11 abandoned rows in the baseline were classified by correlating each one against its start
event. Every one is the same thing: **the session ended without a `Stop` hook that resolved the
open start** — a killed process, a closed terminal, a reaped worktree. None is a skill that errored.

Two specific readings the data rules out:

- **It is not a declined confirmation gate.** The three `github-squash` abandons are not the
  force-push prompt being refused. Declining a gate still ends the turn normally, which fires `Stop`
  and records **`success`**. An abandoned row requires `Stop` never to have run at all. So the
  vocabulary does not conflate user choice with breakage — it conflates _the session dying_ with
  _the skill failing_, which is a different problem and the one worth naming.
- **It is not "the run died 36 minutes in".** See the bug below.

Branch context supports the reaped-worktree reading: 8 of the 11 sit on `loop-plan-*` or other
feature-branch worktrees, which are removed at the end of a loop run.

### Bug found and fixed: abandoned rows were stamped with the wrong time

`sweepAbandonedStarts` set the outcome's `occurred_at` from the **session file's mtime**, which is
the moment the _last start was appended_ — not the moment the abandonment was detected. Every
abandoned row therefore landed 20–30 ms after its own start event, making a 36-minute loop that
died look instantaneous. Combined with `duration_ms` being `null`, an abandoned row carried no
information at all about how much work was lost.

Session `881c5581` shows it plainly: two starts (00:04:24 and 00:04:41) produced two abandoned rows
both stamped 00:04:41.628 — the single file mtime, shared.

Fixed in `packages/agentic-hooks/src/data/persist.ts`:

- `occurred_at` is now the **detection** time.
- `duration_ms` is the **observed lower bound** — last file signal (mtime) minus `started_at` — so
  an abandoned row now says roughly how far the run got before the session went silent.

Rows written before this fix keep the old semantics; treat their `occurred_at` as "when the skill
started", not "when it was abandoned".

### Counting note

`startCorrelationKey` discriminates on `tool_use_id` when present and `started_at` otherwise. Slash
invocations carry no `tool_use_id`, so invoking the same skill twice in one session yields **two**
abandoned rows. The abandoned count is per invocation, not per session.

## Reproducing the baseline

```bash
docker exec openthrottle-postgres-1 psql -U openthrottle_user -d openthrottle -c \
  "select skill_name, count(*) invocations, count(distinct session_id) sessions, string_agg(distinct invocation_path,'/') paths, max(occurred_at)::date last_used from skill_usage_events group by 1 order by 2 desc;"
```

```bash
docker exec openthrottle-postgres-1 psql -U openthrottle_user -d openthrottle -c \
  "select count(*) total, count(agent_id) with_agent_id, count(agent_type) with_agent_type from skill_usage_events;"
```

If `with_agent_id` is still `0`, blind spot 2 is still open.

## If you want to close a blind spot

- **Subagent attribution** needs Claude Code to expose agent identity on
  `PreToolUse`. Until it does, the adapter's optional reads can never fire. Do
  not "fix" the adapter — it is already correct.
- **Read-as-reference** is not closable with hooks. The nearest proxy is a
  `Read` `PostToolUse` hook matching `**/SKILL.md`, which measures file opens,
  not compliance. Weigh the noise before adding it.
- **Cursor coverage** waits on Cursor shipping a tool-level hook.
