# Feature registry refresh

Read the week's landed work and propose the exact changes it makes to OpenThrottle's typed feature registry, then file them as one OpenThrottle plan that `/ot-loop` can execute. This is the loop that keeps every public description of OpenThrottle moving forward: the owner states intent once, and each iteration of the system proposes the next registry update.

## Cadence

Weekly. The registry changes at the speed features land, which is roughly weekly. Run it daily and most runs find nothing; run it monthly and a shipped feature sits on the website as "planned" for weeks.

## Repo context

OpenThrottle is an Nx + pnpm workspace monorepo (Node >= 22, pnpm only).

- **`packages/openthrottle-product/`** is the only source of truth for how OpenThrottle describes itself:
  - `src/data/data.positioning.ts` (`PRODUCT_POSITIONING`) is the positioning canon: tagline, lede and four pillars (`memory`, `runners`, `history`, `local`). The owner wrote it and changes it by hand. **Never propose a change to it.**
  - `src/data/data.features.ts` (`PRODUCT_FEATURES`) is the feature registry, grouped by pillar in display order. Each entry is a discriminated union on `status` (`shipped` | `preview` | `in-flight` | `planned`) with `id`, `name`, `pillar`, `oneLiner` (at most 120 characters), `body`, `evidence { docs, planIds, prs }`, `since` (YYYY-MM-DD) and `public`.
  - `README.md` in that package documents the entry shape and the rules.
- Every surface is built from the registry: the website home page, `@openthrottle/react-router-ui`'s `FEATURES`, the root `README.md` section between `<!-- features:start -->` and `<!-- features:end -->`, the GitHub org profile and the LinkedIn block. After a registry edit, `pnpm nx run @openthrottle/openthrottle-product:generate-surfaces` rewrites the README section, and `check-surfaces` is the drift gate.

Commands and sources this job uses:

```bash
git log --since='8 days ago' --pretty='%h %s' --no-merges origin/main     # what landed
gh pr list --state merged --search 'merged:>=<YYYY-MM-DD>' --limit 100 --json number,title,mergedAt,body
pnpm nx run @openthrottle/openthrottle-product:check-surfaces             # read-only; the registry's own rules
```

OT tools: `get_activity_by_date`, `get_last_activity`, `list_plans_by_status`, `get_plan`, `get_tasks_by_plan_id`, `semantic_search`, `create_plan`, `create_tasks`.

Facts that change the analysis:

- A merged PR's squash commit carries `Plan-Id:` and `Task-Id:` footers. Use them to get from a PR to the plan that explains it, and read that plan's description before deciding what changed for a user.
- `get_activity_by_date` for the last 7 days returns the landed work-ledger artifacts (merged PRs, plan and task status changes). It is the primary input; `git log` is the cross-check.
- Most landed work is not user-facing: refactors, CI, lint rules, test fixes, internal tooling. **The default verdict for a PR is "no registry change".** Only a change a user of OpenThrottle would notice counts.
- `public: true` means the owner approved the entry for public surfaces. This job never flips `public`; a new entry is always proposed with `public: false`, and the task says the owner must approve it.
- The roadmap teaser shows `public` `in-flight` and `planned` entries. Their `evidence.planIds` must point at live plans; a plan that went `CANCELED` makes its entry a removal candidate.

## What to inspect

1. **Status moves.** For each `in-flight` or `planned` entry, check its cited plans. Plan completed and its PR merged: propose `shipped` (or `preview` if it ships behind a flag), with the merged PR numbers as `evidence.prs` and the merge date as `since`. Plan started: `planned` → `in-flight`. Plan canceled: propose removing the entry.
2. **New user-facing capabilities.** A merged PR that adds something a user can see or run, which no entry covers. Propose a new entry under the right pillar, `public: false`.
3. **Stale wording.** An entry whose `oneLiner` or `body` the week's work made untrue or incomplete (a new agent CLI supported, a flag removed, a limit changed). Propose the corrected text.
4. **Evidence gaps.** A `shipped` entry whose cited docs moved or were deleted this week. Propose the new path.

## Hard rules

- **Read-only on source code.** Never edit the registry or any other file, never open a pull request, never commit, never push. Proposing the diff is the job; `/ot-loop` applies it.
- **Never touch `PRODUCT_POSITIONING`**, and never propose flipping `public` to `true`.
- Never write a plan or task as a Markdown file anywhere: plans and tasks live in OpenThrottle only.
- If the `openthrottle-mcp` MCP server is unavailable, **fail loudly**: report the error and stop. Do not fall back to any other medium.
- **Every proposed change must cite its evidence**: merged PR numbers, plan ids, or doc paths from this repository. A change you cannot tie to a landed PR or a plan status is not a finding.
- Copy rules for proposed text: `oneLiner` at most 120 characters; plain, specific claims a user can verify; no internal detail (telemetry numbers, machine counts, costs, internal plan ids in prose); runners and loops are described generically, never as one named runner.
- Author and assignee fields expect the GitHub username `visormatt`, not a display name.

## Dedupe

Before filing anything:

- `list_plans_by_status` for `PENDING`, `IN_PROGRESS` and `BLOCKED` plans titled `🏷️ Feature registry refresh: …`. If one exists and has not run, **append to it** with `create_tasks` instead of filing a second plan, and skip any change one of its tasks already proposes (compare on the entry `id` and the field being changed, not the wording).
- Never file a task that contradicts an existing one. If you reach a different verdict on an entry an open task already covers, append your evidence to that task with `update_task`.
- If `semantic_search` returns nothing for every query, say so in the plan description: "no duplicates found" and "could not check for duplicates" must never look the same.

## Output

Exactly one `create_plan` followed by one `create_tasks` batch (or, per Dedupe, one `create_tasks` batch on the existing plan):

- **Title:** `🏷️ Feature registry refresh: <YYYY-MM-DD>` (today).
- **Author / assignee:** `visormatt`. **Category:** `marketing`. **Project:** `openthrottle-product`. **Tags:** `['follow-up']`.
- **Description:** the window you read (dates, PR count, plans checked), the verdict on each user-facing PR (one line each, including "no change" verdicts for the ones you looked at hardest), and the first line `/ot-loop <this plan's id>` instructions for whoever runs it.
- **Tasks:** one per registry entry touched, each with `sortOrder` set and `wave: 1`, and each fully self-contained:
  - **Entry:** the `id` (new or existing) and its pillar.
  - **Change:** the exact TypeScript object to add, or the exact field-by-field diff to apply to `packages/openthrottle-product/src/data/data.features.ts`, ready to paste.
  - **Evidence:** PR numbers, plan ids and doc paths, with one sentence each on what they show.
  - **Approval:** for a new entry, "Owner approval needed before `public: true`".
  - **Validation:** "Run `generate-surfaces`, commit the README section, then `check-surfaces`, `lint`, `typecheck` and `test` on `@openthrottle/openthrottle-product`."

If the week changed nothing user-facing, **file nothing** and say so plainly in your final message. A quiet week is a valid outcome; a padded registry is actively harmful.
