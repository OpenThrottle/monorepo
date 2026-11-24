# Skill review

Review the agent skills in this repository that have gone longest without a review, using the
`ot-skill-guide` skill, then file what you find as a single OpenThrottle plan.

## Cadence

Weekly, **3 skills per run**. A skill is loaded into an agent's context every time it triggers, so
a stale command or a padded body costs every session that uses it. A full sweep is too many
findings to act on. Three a week covers every owned skill in about six weeks (16 owned skills on
2026-11-22), and a review lands while its findings are still small.

Its slot (Mondays 15:00 UTC, `sonnet`) and how a scheduled fire runs this file are in
`docs/monorepo/recurring-agent-jobs.md`. This file does not create a schedule.

## Repo context

Load the `ot-skill-guide` skill first. Its **Review mode** is the procedure, its
`references/review-checklist.md` is the checklist, and its severity scale (`spec` / `quality` /
`nit`) and report template are the grading. Do not restate them here or invent a second scale.

Skill locations:

- `skills/<name>/` — **owned** skills, authored in this repo. These can be fixed.
- `.agents/skills/<name>/` that is a **real directory** and listed in `skills-lock.json` —
  **vendored**. Report-only: findings are filed as "raise upstream", never as an edit.
- `.agents/skills/<name>` that is a **symlink** — either an owned skill (into `skills/`) or a
  personal one (under `~/.openthrottle/skills/`). Personal skills are **out of scope**: they are
  not committed and belong to one person.
- `.claude/skills/` is a generated fan-out. Never review it separately.

Commands this job uses:

```bash
bash skills/ot-skill-guide/scripts/check.sh skills                # every owned skill, with last-reviewed
bash skills/ot-skill-guide/scripts/check.sh <skill-dir>           # one skill
bash skills/ot-skill-sync/scripts/sync.sh --check                 # layout drift (read-only)
git log -1 --format=%ci -- skills/<name>                          # last touch, as evidence
```

## Selecting the skills

1. Run `check.sh skills` and read each skill's `last reviewed` value.
2. Order by `last-reviewed`, oldest first. **`never` sorts first.** Break ties by the oldest
   `git log` touch date.
3. Take the first **3**. When fewer than 3 owned skills are due, fill the remaining slots with the
   vendored skills of the oldest `skills-lock.json` entries. Their reviews are recorded only in
   this plan, because they cannot be stamped.

## What to do per skill

1. Run `check.sh <skill-dir>` and keep its output verbatim as evidence.
2. Read the whole skill directory, plus the always-on context the skill will sit next to (root
   `AGENTS.md`, `CLAUDE.md`, the area `AGENTS.md`). Restating that context is a finding.
3. Work through `review-checklist.md`. For every item that fails, record the severity, the file and
   line, and the concrete fix.
4. Check its neighbours: name any other installed skill whose description overlaps enough that the
   two would trigger on the same request.

## Hard rules

- **Read-only.** Never edit a skill, never stamp `metadata.last-reviewed`, never re-run the sync in
  write mode. The stamp is applied by whoever lands the fixes, which keeps the date honest.
- Never commit, push or open a pull request.
- Plans and tasks live in OpenThrottle only. Never write findings to a Markdown file.
- If the `openthrottle-mcp` server is unavailable, **fail loudly**: report the error and stop.
- Never propose an edit to a vendored skill. Its fix is an upstream issue, or a new owned skill
  layered on top of it (`docs/Skills.md` § Adoption policy).
- Author and assignee are the GitHub username `visormatt`.

## Dedupe

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS`. This job files plans titled
  `🔁 Skill review: …`. For each open one, `get_tasks_by_plan_id`, then compare findings by
  **skill + checklist item**, not by title.
- A finding an open task already carries is skipped. A new finding on a skill that already has an
  open task is appended to that task with `update_task`, not filed again.
- `semantic_search` on the skill name catches plans filed by a human. If it returns nothing for
  every query, say in the plan description that dedupe was degraded. "No duplicates" and "could
  not check" must never read the same.

## Output

Exactly one `create_plan`, then one `create_tasks` batch:

- **Title:** `🔁 Skill review: <YYYY-MM-DD>`.
- **Status:** `PENDING`. **Tags:** `['follow-up']`. **Category:** `skills`.
- **Author / assignee:** `visormatt`.
- **Description:** the skills reviewed and why they were picked (their `last-reviewed` values), the
  `check.sh` summary line, findings skipped as duplicates, and one ot-skill-guide report header per
  reviewed skill, including clean ones, so the run shows what it covered.
- **Tasks:** one per owned skill with findings, `spec` first, each self-contained: every finding
  with severity, file and line, and fix. Acceptance criteria: `check.sh <skill-dir>` reports
  0 spec, `sync.sh --check` passes, and `metadata.last-reviewed` is set to the landing date. One
  task per vendored skill with findings, worded as an upstream report. Give tasks on different
  skills the same `wave`, since they touch disjoint files.

If every reviewed skill is clean, **file nothing** and say so in your final message, listing the
three skills and their report headers. Their stamps are then owed: name them so a human can apply
the date.
