# Replay fixture drift

Re-record the agent-CLI replay transcripts against the CLIs installed on this machine, find the ones whose protocol has drifted from what is committed, and file the drift as a single OpenThrottle plan.

## Cadence

Weekly. The agent CLIs ship every few days, and a transcript recorded against an old build keeps passing its replay test while production talks to the new one. That staleness is the whole risk this job exists for: the reference implementation this harness was modelled on let 35 of its 39 Claude transcripts fall two SDK minors behind because nothing re-recorded them. Weekly catches a stream-json change within a release or two, and it is infrequent enough that the token spend (every scenario, every installed CLI) stays small.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only). Run every task through Nx, prefixed with `pnpm`, never the underlying tooling directly.

Commands this job uses:

```bash
pnpm nx run agentic-replay-testing:check-drift                                   # every backend; Markdown report on stdout, exit 1 on drift
pnpm nx run agentic-replay-testing:check-drift -- --backend codex,cursor         # a subset
pnpm nx run agentic-replay-testing:check-drift -- --backend claude --json /tmp/drift.json
pnpm nx run agentic-replay-testing:test                                          # the replay tests against the COMMITTED transcripts
```

Facts that change the analysis:

- `@openthrottle/agentic-replay-testing` holds one NDJSON transcript per scenario per backend under `packages/agentic-replay-testing/fixtures/<backend>/`. Its README describes the format and the backends table; read it first.
- `check-drift` records into a temp directory and never touches `fixtures/`. It compares each fresh transcript with the committed one structurally:
  - **argv** and **stdin**, exactly. A change means our argv builders or prompt layers moved, or a scenario changed. The replay tests fail on the same change, so check whether `test` is already red before you call it CLI drift.
  - **stdout event shapes**, as sets. A shape is the line's `type`/`subtype`/`event` plus the `type` of a nested `event`, `item`, `part`, `message` or `step_update`. An added shape is an event the parsers may not handle. A removed shape may be one they depend on.
  - **exit class**: success, failure or termination.
- **Model variance produces shape noise.** A model that chooses a different tool this week adds or removes tool-call shapes with no CLI change at all. Re-run the scenario before you trust a shape-only finding. Use `--backend <id>` and compare the reported shapes across both runs.
- A backend is **skipped** when its CLI is not installed or it has no committed transcripts. That is not drift; just list it.
- A transcript that **could not be re-recorded** is usually auth, quota or account configuration (gemini needs `GOOGLE_CLOUD_PROJECT`; opencode's plan-run model is gated on the account). Report the error text. It is only drift if the CLI itself changed how it fails.

## What to inspect

1. Run `check-drift` for every backend, and keep the Markdown report.
2. For every finding, classify it:
   - **CLI drift**: the installed version differs from the committed one, and the finding persists on a second run. This is the main thing this job looks for.
   - **Model variance**: same version, shape-only, and gone or different on a second run. Drop it, but count it.
   - **Our drift**: argv or stdin changed and `pnpm nx run agentic-replay-testing:test` also fails. This is a repo change that forgot to re-record, not a CLI change.
   - **Environment**: recording failed for auth, quota or account reasons.
3. For each CLI-drift finding, open the backend's parser (`packages/openthrottle-agentic-utils/src/utils/conversation-backend/<backend>/events.ts`) and say whether the new or removed shape is handled, ignored, or mis-mapped.

## Ranking

1. CLI drift on an event the parser maps or depends on (a removed `result`/`session`/`usage` shape, a renamed tool event). Production chat or plan runs may already be broken.
2. Our drift: the replay tests are red on `main`.
3. CLI drift on an event the parser ignores. It's harmless today, but re-record so the fixtures stay current.
4. Environment failures that hide a backend from the check entirely.

Cap the run at **10 findings**. Group one backend's re-record into a single finding when its transcripts drifted for one cause.

## Hard rules

- **Read-only on source code and on `fixtures/`.** Never edit a parser, never run the `record` target, never rewrite a transcript. Re-recording is a reviewed change, not a job side effect.
- Never open a pull request, never commit, never push.
- Never write a plan or task as a Markdown file anywhere. Plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Do not run destructive or stateful commands (no migrations, no installs, no CLI upgrades, no `auth login`).
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans. A previous run of this job files plans titled `🔁 Replay drift: …`.
- `semantic_search` on each finding's subject (the backend plus the event or argv change) to catch a plan filed by a human or another job.

Then:

- If an open plan already covers a finding, **skip it**. Do not re-file it.
- If an open plan covers the backend but misses a materially new finding, add that finding as a task to the existing plan (`create_tasks`) rather than opening a second plan.
- Only open a new plan for findings genuinely not represented anywhere.

Dedupe is not finished when you have checked for a duplicate _plan_. Three rules that apply every run:

- **Compare against the existing plan's tasks, not just its title.** When an open plan from this job exists, call `get_tasks_by_plan_id` on it and check each finding against the tasks already there, matching on backend and shape. File a task only for a subject no existing task covers.
- **Never file a task that contradicts an existing one.** If this run reaches a different verdict on a subject an existing task already covers, append the disagreement and your evidence to that task with `update_task`.
- **Say so when dedupe is degraded.** If `semantic_search` returns nothing for every query you try, state plainly in the plan description that the index was unavailable. "No duplicates found" and "I could not check for duplicates" must never look the same.

## Output

Exactly one `create_plan` (with `tags: ['follow-up']`), followed by one `create_tasks` batch:

- **Title:** `🔁 Replay drift: <YYYY-MM-DD>` (today's date).
- **Author / assignee:** `visormatt`.
- **Category:** `testing`.
- **Description:** the CLI versions committed vs installed per backend, which backends were skipped and why, how many findings were dropped as model variance or by the cap, and the duplicates you skipped.
- **Tasks:** one per finding, ordered by the ranking above, each fully self-contained:
  - the backend, the transcript stems, and the exact shapes or argv elements that changed,
  - whether the parser handles the change, with the file path,
  - the command to reproduce (`pnpm nx run agentic-replay-testing:check-drift -- --backend <id>`),
  - acceptance criteria: the parser handles the shape (if it must), the transcripts are re-recorded with `pnpm nx run agentic-replay-testing:record -- --backend <id>`, and `pnpm nx run agentic-replay-testing:test` passes.

If nothing material is found, **file nothing**. Say so plainly in your final message, along with the versions you checked. An empty run is a valid outcome, but a padded plan is not.
