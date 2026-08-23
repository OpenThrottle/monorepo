# Doc drift

Find documentation in this monorepo that no longer matches the code — commands that would fail, paths that no longer exist, architecture described a rename or two ago — then file the findings as a single OpenThrottle plan.

## Cadence

Weekly. This repo's documentation is not decoration: `CLAUDE.md`, `AGENTS.md`, and the rule files are loaded into agent context on every run, so a stale command doesn't just confuse a reader — it makes an unattended agent execute the wrong thing. Weekly keeps the gap between a rename and its documentation short enough that the person who renamed it is still around.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only). Run every task through Nx, prefixed with `pnpm` — never the underlying tooling directly.

Commands this job uses:

```bash
pnpm nx show projects                      # project inventory
pnpm nx show project <project> --json      # a project's real targets
node -e "console.log(Object.keys(require('./package.json').scripts).join('\n'))"   # real root scripts
pnpm run check:target-descriptions         # scripts/audit-target-descriptions.ts --check
pnpm run check:local:agent-assets          # agent-asset SSOT + frontmatter validation
git log -1 --format=%ci -- <path>          # last touch date, for staleness evidence
```

Documentation surfaces in scope:

- Root: `CLAUDE.md`, `AGENTS.md`, `MONOREPO.md`, `CONTRIBUTING.md`, `README.md`.
- The three-tier `AGENTS.md` hierarchy: root, mid-level, and per-project files under `applications/*`, `packages/*`, `tools/*`.
- `docs/**` — including `docs/monorepo/agent-editor-folders.md` (folder layout and agent/editor paths) and `docs/tools/templates/AGENT_USAGE.md` (generator usage).
- Agent assets: `.agents/skills/**/SKILL.md`, `.agents/personas/**`, `.agents/prompts/**`, `.agents/rules/**` — plus their mirrors under `.cursor/` and `.claude/`.
- Per-package `README.md` files and `databases/README.md`.

Facts that change the analysis:

- `skills/` is the authored SSOT; `.agents/skills` is the generated SSOT view and `.claude/skills` fans out from it (there is no `.cursor/skills`). A discrepancy between a source and its mirror is drift, but the fix is a re-sync, not a hand edit of the mirror — say so in the task.
- `.agents/rules/` is the single source of truth for code style — `.cursor/rules/**/*.mdc` are symlinks into it for Cursor to load, never a write target. Docs that restate style rules inline can contradict the rule; prefer pointing at it over duplicating it.
- Generators are invoked with a mandatory `NX_ISOLATE_PLUGINS=false` prefix. A documented generator command missing that prefix will fail — that is a finding, not a nitpick.
- Some documented React Router generators are described under an older `remix` name in places; the working generator is `react-router`.
- Roughly twenty projects are intentionally **source-first** with no `build` target. Documentation telling a reader to build them is wrong. Never trust a hardcoded count — audit it live by diffing `pnpm nx show projects` against `pnpm nx show projects --with-target=build`, the way `MONOREPO.md` § "Projects without a `build` target" instructs.
- Prompts under `.agents/prompts/` need no frontmatter — slug and title derive from the filename. Skills, personas, and rules do have frontmatter requirements enforced by `check:local:agent-assets`.

## What to inspect

1. **Every documented command.** Extract commands from all in-scope docs and verify each one exists: root `package.json` scripts, and Nx targets via `nx show project`. Flag any command that would fail outright, plus commands that exist but are documented with the wrong flags, wrong project name, or a missing required prefix. Do not execute long or stateful commands to check them — verify against the project/script inventory.
2. **Paths, packages, and filenames.** Every path, package name, and filename mentioned in prose or a link — does it still exist? Renames are the dominant source of drift here.
3. **Broken links and dead references.** Relative Markdown links that resolve to nothing; references to skills, rules, or personas by a slug that no longer exists.
4. **Missing docs.** Projects with no `AGENTS.md` where the three-tier hierarchy requires one; packages with no `README.md`; targets missing descriptions per `check:target-descriptions`.
5. **Architecture described stale.** Docs describing retired modules, renamed packages, a removed transport, or a workflow that has since been replaced. This is the highest-value and hardest category — read for meaning, not just for string matches.
6. **Mirror drift.** `.agents/` SSOT content that diverges from its `.cursor/` or `.claude/` mirror.

## Ranking

Order findings by how likely the staleness is to mislead an agent mid-run:

1. A wrong command or wrong rule in `CLAUDE.md` / root `AGENTS.md` — these load into every agent's context and get executed.
2. A wrong command in a per-project `AGENTS.md` or a skill — same failure mode, narrower blast radius.
3. Architecture described as it no longer is — sends a reader down a path that no longer exists.
4. Broken paths and dead links in `docs/**`.
5. Missing `AGENTS.md` / `README.md` files.
6. Typos, formatting, and prose polish — usually not worth a task at all.

Cap the run at **15 findings**. If you find more, keep the top 15 and say in the plan description how many you dropped.

## Hard rules

- **Read-only.** Never edit a documentation file, never fix a link, never regenerate a mirror. Filing the finding is the job — including when the fix is a one-word change.
- Never open a pull request, never commit, never push.
- Never write a plan or task as a Markdown file anywhere — plans and tasks live in OpenThrottle only. (This job is about Markdown; it still must not produce any.)
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Do not run destructive or stateful commands (no migrations, no `database:reset`, no installs, no generators — verifying a generator exists is done by listing, not by running it).
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans — a previous run of this job files plans titled `🔁 Doc drift: …`, and there is existing documentation-migration work in the backlog.
- `semantic_search` on each finding's subject (the doc path plus the specific stale claim) to catch a plan filed by a human or another job.

Then:

- If an open plan already covers a finding, **skip it** — do not re-file.
- If an open plan covers the document but misses a materially new finding, add that finding as a task to the existing plan (`create_tasks`) rather than opening a second plan.
- Only open a new plan for findings genuinely not represented anywhere.

## Output

Exactly one `create_plan`, followed by one `create_tasks` batch:

- **Title:** `🔁 Doc drift: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `documentation`.
- **Description:** which surfaces were swept, how commands were verified, how many findings were dropped by the cap, and anything skipped as a duplicate.
- **Tasks:** one per document (or per closely-related cluster), ordered by the ranking above, each fully self-contained:
  - exact file path and line for every stale claim,
  - what the doc says versus what is actually true, with the evidence (the real target list, the real path, the commit that renamed it),
  - the corrected wording where it is unambiguous,
  - explicit acceptance criteria, including that `pnpm run check:local:agent-assets` still passes for any agent-asset edit.

If nothing material is found, **file nothing** and say so plainly in your final message. An empty run is a valid outcome; a padded plan is not.
