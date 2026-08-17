# Roadmap proposals

Read a month of this project's actual activity as a senior advisor would, and propose the two or three highest-leverage **large** changes nobody files as a bug because they are too big — then file them as a single OpenThrottle plan.

## Cadence

Monthly. This is the one job that thinks rather than sweeps, and its input is a _trend_: a month is the shortest window in which commit themes, backlog shape, and repeated patching become legible. Run it weekly and you get noise dressed up as strategy; run it quarterly and you propose a redesign three months after the pain became obvious.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only) that does both task running and package publishing.

- **`applications/`** — deployable apps. `openthrottle-server` is the NestJS code-first GraphQL API; `openthrottle-developer`, `openthrottle-admin`, `openthrottle-email`, `openthrottle-website` are React Router (v8) + Vite apps.
- **`packages/`** — `@openthrottle/nestjs-*` server modules, `@openthrottle/react-router-*` shared UI/client libraries, `openthrottle-agentic-*` agentic tooling, `openthrottle-mcp`.
- **`tools/`** — Nx plugins, `@tools/generators`, `@tools/workflows`.
- **`databases/`** — Postgres schema, migrations, ingest.

Commands and sources this job uses:

```bash
git log --since='30 days ago' --pretty='%h %s' --no-merges     # what actually got built
git log --since='30 days ago' --name-only --pretty=format:     # where the effort landed, by path
gh pr list --state all --limit 100 --json number,title,state,createdAt,mergedAt
gh pr list --state open --json number,title,createdAt,reviewDecision
```

OT tools: `list_plans_by_status`, `get_plan`, `get_tasks_by_plan_id`, `semantic_search`, `list_sources`, `get_document`, `create_plan`, `create_tasks`.

Facts that change the analysis:

- There is an existing **living roadmap plan** in OpenThrottle — find it with `semantic_search` (it is never marked "completed"; it is maintained by updating its description). **Reference it; never duplicate or replace it.** A proposal that restates something already on the roadmap is not a proposal.
- The backlog is large and many plans are `DONE` with unmerged pull requests. Volume of open plans is not by itself evidence of a missing abstraction — check whether the plans are actually blocked or merely unmerged before drawing a conclusion.
- Model-selection guidance already exists in `CLAUDE.md` for choosing which model runs which kind of work; a proposal about agent orchestration should build on it rather than reinvent it.
- `semantic_search` and `list_sources` reach an ingested knowledge base of repo documentation — use them to check whether a "gap" you identified is actually a documented, deliberate decision.
- Read-only means read-only here too: this job does not touch the roadmap plan, only cites it.

## What to inspect

1. **Where effort actually went.** Cluster the last 30 days of commits by path and by theme. Compare that against what the roadmap plan says the priorities are. A persistent gap between the two is itself the most interesting finding you can produce.
2. **Backlog shape.** Read the open OT plans as a set, not individually. Several small plans circling the same missing abstraction are one large change wearing a disguise — that pattern is the primary thing this job exists to spot.
3. **Repeatedly patched subsystems.** Files and modules touched by many separate fixes in the window. Repeated patching of one area is the clearest available signal that the design, not the code, is what is wrong.
4. **Capability gaps and coming migrations.** What the product plainly needs next and does not have; dependency or platform migrations coming due (framework majors, runtime versions, deprecated APIs) that will be cheaper now than under deadline.
5. **What to kill.** Explicitly look for features, packages, flows, or abstractions that cost more than they return — unused, half-migrated, or superseded. Proposing a deletion is a legitimate and frequently the highest-value output of this job.
6. **The friction the team works around.** Recurring manual steps, known gotchas repeated in commit messages and documentation, and workarounds that have quietly become permanent.

## Ranking

Order proposals by leverage — what each one unlocks beyond itself:

1. A change that removes a whole class of recurring work (the missing abstraction behind many small plans).
2. A deletion that removes maintained surface without losing capability.
3. A migration that gets cheaper the sooner it happens and more expensive every month it waits.
4. A capability gap blocking where the product is clearly heading.
5. A redesign of a repeatedly patched subsystem.

Cap the run at **3 proposals, maximum** — and fewer is better. **This job fails by being noisy.** One proposal with a real argument behind it beats three plausible ones; if only one survives scrutiny, file one.

## Hard rules

- **Read-only on source code.** Never edit, fix, refactor, or prototype anything. Proposing is the job.
- Never open a pull request, never commit, never push.
- **Never modify the living roadmap plan** or any other existing plan. Cite it; do not edit it.
- Never write a plan or task as a Markdown file anywhere — plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- Do not run destructive or stateful commands (no migrations, no `database:reset`, no installs).
- **Every proposal must carry evidence from this repository** — specific commits, plans, paths, or pull requests. A proposal that would read the same for any monorepo is not a finding; delete it before filing.
- **Every proposal must include the strongest honest argument against doing it.** A proposal with no counter-argument has not been thought through and must not be filed.
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything, check what already exists:

- `list_plans_by_status` for `PENDING` and `IN_PROGRESS` plans — a previous run of this job files plans titled `🔁 Roadmap proposals: …`. Read the last one and do not re-propose what it already argued.
- Find and read the **living roadmap plan** — anything already on it is out of scope by definition.
- `semantic_search` on each proposal's core idea; large ideas are frequently already written down somewhere in the backlog.

Then:

- If a proposal is already on the roadmap or in an open plan, **drop it entirely**. Do not re-file it with better wording.
- If a previous proposal was filed and never acted on, do not re-file it. Note in the plan description that it is still open and still relevant — that is more useful than a duplicate.
- Only file proposals genuinely not represented anywhere.

Dedupe is not finished when you have checked for a duplicate _plan_. Three rules that apply every run:

- **Compare against the existing plan's tasks, not just its title.** When an open plan from this job exists, call `get_tasks_by_plan_id` on it and check each finding against the tasks already there, matching on the finding's subject (the proposal's subject). File a task only for a subject no existing task covers. A run that re-files a finding the plan already carries has duplicated it, even though it opened no second plan.
- **Never file a task that contradicts an existing one.** If this sweep reaches a different verdict on a subject an existing task already covers, do not file an opposing task alongside it. Append the disagreement and your evidence to that task's description with `update_task`, so a human resolves one task instead of discovering the conflict halfway through executing the plan.
- **Say so when dedupe is degraded.** If `semantic_search` returns nothing for every query you try, treat the index as unavailable rather than as proof that no duplicate exists, and state that plainly in the plan description. "No duplicates found" and "I could not check for duplicates" must never look the same to whoever reads the plan.

## Output

Exactly one `create_plan`, followed by one `create_tasks` batch:

- **Title:** `🔁 Roadmap proposals: <YYYY-MM>` (this month).
- **Author / assignee:** `visormatt`.
- **Category:** `planning`.
- **Description:** the synthesis — what the last 30 days of commits, the backlog, and the open pull requests actually say about where effort is going; how that compares to the living roadmap plan (linked by id); what you considered and rejected, and why; and any previously filed proposal that remains open and relevant.
- **Tasks:** one per proposal (**at most 3**), ordered by the ranking above, each fully self-contained and structured as:
  - **The problem** — one paragraph, with the specific evidence: commits, plan ids, paths, pull requests.
  - **The proposed change** — concretely what would be built, moved, or deleted.
  - **What it unlocks** — the work it makes unnecessary or the capability it makes possible.
  - **Rough size** — order of magnitude in days, and which projects it touches.
  - **Migration risk** — what breaks along the way, and what the rollback is.
  - **The strongest argument against** — the best case for not doing this, stated fairly and not as a straw man.

If the month produced nothing worth proposing, **file nothing** and say so plainly in your final message. An empty month is a valid and honest outcome; a padded roadmap is actively harmful.
