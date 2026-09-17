---
description: >-
  Aggregate local OpenThrottle (OT) usage into a privacy-preserving telemetry
  report — plans, tasks, skill usage, model/token cost, and agent runs over a
  bounded time window. USE WHEN aggregating OT usage stats, generating a
  telemetry report, answering "how much am I using OpenThrottle", sharing
  usage numbers with a team or manager, or running `/ot-telemetry`.
metadata:
  author: openthrottle
  version: '0.1.0'
name: ot-telemetry
---

# ot-telemetry

Local-only usage reporting for OpenThrottle. This skill turns the local OpenThrottle Postgres
database into a small, shareable summary of how OT is being used — without ever sending anything
over the network or naming what was actually worked on.

## When to read this skill

- The user asks how much they (or their team) are using OpenThrottle.
- The user wants a telemetry report, a usage summary, or usage numbers to share.
- The user runs `/ot-telemetry`.

## Workflow

When this skill fires (the user asks for usage numbers, a telemetry report, or runs
`/ot-telemetry`):

1. Run the bundled script (see **Bundled script** below for the exact command). Do not pass any
   flags unless the user asked for a non-default window, output location, detail level, or format.
2. Read `report.md` back and summarize it for the user in chat — the headline paragraph plus
   anything they specifically asked about. Do not paste the whole file into chat by default; offer
   to share it if they want the raw file.
3. Tell them exactly where the two files landed (`report.json` and `report.md`, with the resolved
   `--out` directory).
4. State plainly that **nothing was uploaded** — the script only opened a local, read-only
   Postgres connection and wrote two local files. There is no other network call anywhere in this
   script.
5. If the user wants to share the report, that is their call to make (e.g. pasting `report.md`
   into a chat) — this skill never sends it anywhere on their behalf.

## Non-negotiable guarantees

1. **Local-file only.** The script reads the local OpenThrottle Postgres database and writes only
   to a local scratch directory. It NEVER uploads anything and NEVER makes a network call other
   than the local Postgres connection itself.
2. **Read-only.** The script connects read-only — no writes, no schema changes, no mutation of any
   OpenThrottle table.
3. **Aggregates only, by default.** The default (and safest) detail level reports counts, sums, and
   distributions only. It never includes, by default:
   - plan or task titles or descriptions
   - working-directory or file-system paths
   - git branch names
   - free-text args or invocation paths
4. **Bounded window.** Every run operates over an explicit time window, not the whole history.

`--detail identifiers`/`--detail full` are a documented opt-in surface for future metric work (see
**Privacy contract by detail level** below) — no metric varies by detail level today, so the
default output is always safe to paste into a chat message or share with a manager without a
second look, regardless of which `--detail` value was passed.

## Data source

Connects to the local OpenThrottle Postgres instance using the repo's existing environment
precedence (first match wins):

1. `OPENTHROTTLE_POSTGRES_URL`
2. `POSTGRES_URL`
3. Discrete `POSTGRES_*` pieces (host/port/db/user/password)

See `databases/README.md` in the
[openthrottle/monorepo](https://github.com/openthrottle/monorepo) repo for the canonical
connection conventions this reuses.

## CLI flags

All flags are optional; every default is chosen for the cautious case.

| Flag       | Default                                                                                                      | Meaning                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--since`  | 90 days before now                                                                                           | Window start. Any string `Date` can parse (e.g. `2026-01-01`, an ISO date-time). Invalid input fails loudly.                                                           |
| `--until`  | now                                                                                                          | Window end. Same parsing as `--since`. `--since` must be strictly before `--until`.                                                                                    |
| `--out`    | a scratch dir under the OS temp dir (`os.tmpdir()/ot-telemetry-reports`), **never** this repo's working tree | Directory the two files are written to. Created if missing.                                                                                                            |
| `--detail` | `aggregate`                                                                                                  | One of `aggregate` \| `identifiers` \| `full` — see the privacy-contract table below. Recorded in both `report.json`'s `detailLevel` field and the `report.md` header. |
| `--format` | `both`                                                                                                       | One of `both` \| `json` \| `md` — which file(s) get written.                                                                                                           |

Example: `pnpm exec tsx skills/ot-telemetry/scripts/report.ts --since 2026-01-01 --until 2026-04-01
--out ./tmp/ot-report --detail aggregate --format both`

## Privacy contract by detail level

`aggregate` is the only level any metric query currently varies its behavior for — **no metric
family reads a different set of columns at `identifiers` or `full` today.** Selecting a wider
level only changes `detailLevel` in the envelope and the note in the Markdown header; it does not
silently add data the query layer doesn't yet compute. `identifiers` and `full` are reserved,
documented opt-in levels for future metric work — a metric that wants to report a repo/branch name
or a title must say so explicitly when it lands, not inherit it silently from this flag.

| Detail level  | Plan/task titles or descriptions         | Working-directory / filesystem paths | Git branch names                         | Free-text args / invocation paths | Provider `raw_usage` blobs |
| ------------- | ---------------------------------------- | ------------------------------------ | ---------------------------------------- | --------------------------------- | -------------------------- |
| `aggregate`   | Never                                    | Never                                | Never                                    | Never                             | Never                      |
| `identifiers` | Never                                    | Never                                | Reserved, not yet captured by any metric | Never                             | Never                      |
| `full`        | Reserved, not yet captured by any metric | Never                                | Reserved, not yet captured by any metric | Never                             | Never                      |

Every row above that says "Never" means exactly that: no query in this script's implementation
selects that data, at any detail level, in this schema version. "Reserved, not yet captured by any
metric" means the level exists as documented surface for a future task to opt a specific metric
into — it is not silently on today, and the Markdown report says so in its own words.

## Time window

- Default window: **last 90 days**.
- Overridable with `--since` / `--until` — see **CLI flags** above for exact semantics.

## Metric families

The report aggregates across these families:

| Family        | What it counts (aggregate only)                      |
| ------------- | ---------------------------------------------------- |
| Plans         | counts by status, counts created/completed in-window |
| Tasks         | counts by status, counts created/completed in-window |
| Skill usage   | invocation counts per skill name, in-window          |
| Models / cost | token counts and cost by model, in-window            |
| Agent runs    | counts by outcome (e.g. succeeded/failed), in-window |

No row in the aggregate output identifies a specific plan, task, or run by name — only counts and
sums grouped by these dimensions.

## Output

Two files are written to `--out` (default: a scratch directory under the OS temp dir — never this
repo's working tree, never committed, never uploaded):

- `report.json` — the versioned envelope (schema version, window bounds, generated-at timestamp,
  `detailLevel`, `actorKey`, `repoSlug`, `migrationHighWaterMark`, the `skipped` list, and every
  metric family) suitable for further local processing.
- `report.md` — a human-readable summary of the same data: a headline paragraph, the `skipped`
  list (so the reader knows what their box could not answer), and a small table per metric family.
  This is the file meant for pasting into a message — read it once before sharing it, since it is
  designed to be legible standalone without opening `report.json`.

`--format` controls which of the two get written (default `both`).

## Bundled script

`scripts/report.ts` is the executable that implements the behavior above:
`pnpm exec tsx skills/ot-telemetry/scripts/report.ts [flags]` (see **CLI flags**). It connects
read-only, probes what the local schema actually has, runs every metric family the probe says is
satisfiable (skipping — never crashing on — the rest), and writes the envelope plus its Markdown
rendering to `--out`. See `scripts/README.md` for the module-by-module breakdown.

## How to share this

`report.md` is the file meant to leave your machine — paste it into a chat, an email, or a status
update. Read it once yourself first (30 seconds; it is short and legible top to bottom) so you are
the one vouching for what it says, not just forwarding a file. Do not paste `report.json` into a
chat by default — it is the same data, just harder for a human to skim; share it only if someone
specifically wants to process it. Never edit either file before sharing it — if a number looks
wrong, that is a bug to report, not a line to delete.

**What a recipient sees** (excerpt from a real run against this repo's own OpenThrottle database,
default flags — a few sections trimmed for length; nothing below was edited otherwise):

```markdown
# OpenThrottle Usage Report

- **Window:** 2026-06-19T07:45:38.901Z → 2026-09-17T07:45:38.901Z
- **Generated at:** 2026-09-17T07:45:39.071Z
- **Detail level:** `aggregate`
- **Repo:** OpenThrottle/monorepo
- **Schema version:** 1
- **Migration high-water mark:** 125_flag_fixture_rows_in_skill_usage_events.sql
- **Actor key:** <32-hex-actor-key>

## What is in this file

This report was generated entirely from a **local, read-only** connection to your OpenThrottle
Postgres database. Nothing in this file — or in the run that produced it — was ever uploaded
anywhere; there is no network call in this script other than that local Postgres connection. You
can verify every claim below by reading `report.json` alongside this file: every number here
traces back to a field in that envelope.

- **Detail level:** `aggregate` — aggregate: counts, sums, and distributions only — no titles,
  paths, or branch names.
- **Never included, at any detail level today:** plan/task titles or descriptions,
  working-directory or file-system paths, git branch names, free-text args or invocation paths, or
  any provider `raw_usage` blob.
- **Identity:** `actorKey` (if present) is a one-way hash of a git email, namespaced with a
  constant. It dedupes people across runs without naming anyone, and there is no way to read an
  email back out of it. It is pseudonymous, not anonymous: because the namespace is a public
  constant in the skill, someone holding a list of candidate emails (a repo git log, say) can hash
  those and see which one matches. Treat it as "stable id for this person", not as "unlinkable to
  this person".

## Headline

Over the last 90 days, 555 plan(s) and 3,255 task(s) were completed. Top skills by invocation
count: ot-claude-loop (134), github-squash (120), github-pull-request (98). Top models by
invocation count: cursor/auto (135), opencode/opencode/big-pickle (8), grok/grok-4.6 (4). Total
tracked spend in window: $2.47.

## Skipped metrics

None — every metric family in this schema version could be computed against this database.

## Plans

| Metric                    | Value                |
| ------------------------- | -------------------- |
| Lifetime total            | 994                  |
| Created in window         | 470 (source: hybrid) |
| Completed in window       | 555 (source: hybrid) |
| Zero-task plans           | 34                   |
| Time to complete (median) | 17.8h                |
| Time to complete (p90)    | 153.7d               |

…(a small table per metric family follows the same shape — see **Metric families** above)
```

Notice what is absent even in this real excerpt: no plan or task ever named, no path, no branch, no
raw provider payload — only counts, sums, and labels drawn from a fixed vocabulary (statuses,
categories, skill/model names). That is the privacy contract this skill exists to keep, and it is
the same reason `report.md` is safe to paste without a second look.

## Cross-links

- [`ot-plans`](../ot-plans/SKILL.md) — the plans/tasks data model this reads from.
- [`ot-postgres`](../ot-postgres/SKILL.md) — Postgres conventions and connection precedence.
- [`ot-skill-sync`](../ot-skill-sync/SKILL.md) — how this skill reaches every agent folder.
- Repo root: [openthrottle/monorepo](https://github.com/openthrottle/monorepo)
