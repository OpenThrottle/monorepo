---
name: ot-loop-review
description: >-
  Review an executed OpenThrottle plan run for friction and defects, and file
  concrete follow-ups. USE WHEN the user runs /ot-loop-review <planId|taskId>,
  says "review that plan run", "what went wrong in plan <id>", or "how did that
  loop go". The reflection stage after ot-loop; read-only on code, additive in OT.
argument-hint: <planId|taskId>
arguments:
  id: string
disable-model-invocation: true
---

Important: `$id` is the first (and only) argument passed to this prompt. It is an OpenThrottle **Plan** or **Task** UUID. If it resolves to neither, throw an error immediately — do not guess, do not search for a "close enough" plan.

Your job is to look back at a plan that [`ot-loop`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-loop/SKILL.md) already executed and answer one question honestly: **how did that run actually go?** You audit the run against a fixed rubric, separate defects from friction, and file the follow-ups that deserve to exist. You do not fix anything.

## Resolve the argument first

1. `get_plan(id)`. If it resolves, the review scope is that plan and all of its tasks.
2. Otherwise `get_task(id)`. If it resolves, the review scope is **that task in the context of its parent plan** — load the parent via the task's `planId` so the run-level dimensions (setup, finishing, teardown) still have evidence, but keep the findings scoped to the task.
3. If neither resolves, **throw**. Same hard-fail contract as `ot-loop`: a review of the wrong plan is worse than no review.

## Guardrails

These are not suggestions. A review that mutates the thing it reviews cannot be trusted twice.

- **Read-only on source code.** Read the repo freely; never edit a file in it, never run a formatter or a `--fix`.
- **Never touch the reviewed branch.** No commits, no rebases, no pushes, no force-pushes.
- **Never flip plan or task status.** A stranded `IN_PROGRESS` task is a _finding_, not something to tidy away. Closing it destroys the evidence and hides the pattern from the next review.
- **Never merge, close, reopen or mark ready** the run's PR.
- **Never tear down or resurrect a worktree.**
- **It files findings; it does not fix them.** The only writes it makes are additive OT records: plan output, new plans, work artifacts.

The one deliberate asymmetry: this skill may **propose** edits to `ot-loop` and `agents-ralph`, but never make them. Fixing the loop from inside a review of the loop is how a rubric quietly rewrites itself to pass.

## Scope for v1

Fired **manually**, one run at a time. Wiring it in as an automatic post-execution stage of every `ot-loop` run is explicitly out of scope until the rubric has met real runs and earned it — see the dry-run discipline at the end of this file.

## Gather the evidence

**First, work out which repo the run happened in.** Do not assume it was this one. A plan carries a `project`, and the narration usually names the worktree path it ran in — an OT plan can drive a completely different repository (`~/.openthrottle/worktrees/<org>/<repo>/<name>`). Every `git` and `gh` step below is scoped to _that_ repo. Running them against the wrong checkout produces a confident report built on an empty search, which is the worst output this skill can produce. State the repo you read in the report's opening sentence.

Then read these in order. Each one has a **degraded path** — say what you could not see rather than inferring it. A review that quietly guesses is worse than one that says "not observable", because the guess gets acted on.

### 1. Plan and tasks

`get_plan(planId)` and `get_tasks_by_plan_id(planId)`. This is the spine of the review.

- **Statuses** — anything still `PENDING`, `QUEUED` or `IN_PROGRESS` on a plan marked `COMPLETED` is a defect, and the most common one.
- **`sortOrder`** — did execution follow it, or jump around?
- **`createdAt` vs the plan's** — a task created well after the plan was created was added mid-run.
- **`summary`** — often the richest single field on a task, and easy to miss. A `SKIPPED`/`BLOCKED` task's reason lives here, and so does the story of a requirement that was deliberately deferred. Read every non-null one.
- **`updatedAt`** — the status-flip timestamps. Per-task duration comes from here, and so does the overlap check: if task B's first flip to `IN_PROGRESS` precedes task A's flip to `COMPLETED`, the one-`IN_PROGRESS` invariant was broken.

_Degraded:_ `updatedAt` is last-write-wins, not a status history — a task edited after completion shows the edit time. Treat overlap as **suspected**, not proven, and corroborate against commit timestamps before calling it a defect.

### 2. The narration stream

`get_plan_output(planId)`.

- Is there any output at all? A run with no narration is unreviewable on the qualitative dimensions and should say so in one line rather than padding.
- Are chunks tagged with the `taskId` they describe? In practice most runs do not tag at all, and some carry an `iteration` number instead — which correlates a chunk to a loop pass rather than to a task, and is the next-best join when `taskId` is null. Report untagged narration once, as low-grade friction; do not re-litigate it per chunk.
- **Does every task appear in the narration at all?** A task whose work shipped without a single word about it is the gap worth naming — much more than a mistagged chunk. Batching two related tasks into one chunk is fine and common; total silence on a task is not.
- Read it for what the executor _said_ it did, then check whether the git history agrees. Divergence between narration and commits is a high-value finding.

_Degraded:_ output may have been cleared with `delete_plan_output` during a reset. Absence is not proof the executor stayed silent.

### 3. Git history

The `Plan-Id:` / `Task-Id:` footers are the join key between OT and the repo. They are well-established — this repo carries 178 `Plan-Id:` and 362 `Task-Id:` footers in history, so their absence on a given run is a signal, not a convention gap.

```bash
git log --all --format='%H %ci %s%n%b' --grep='Plan-Id: <planId>'
git log --all --format='%H %s' --grep='Task-Id: <taskId>'
```

- **Commit count vs task count** is the cheapest signal for skipped per-task commits. Fewer commits than tasks means work was batched; far more means the loop churned.
- **Commit timestamps** give real per-task duration, and corroborate the overlap check from (1).
- **Footer presence** — a work commit on the branch with no footers is untraceable and worth a finding.

_Degraded:_ if the branch was squashed (which `ot-loop` prescribes), you will find **one** commit carrying every task's `Task-Id:` footer — that is the expected end state, not a batching failure. The per-task shas usually survive in the narration, which recorded them as each task closed; that is the cheapest recovery. Otherwise read the PR's commit list. Read the PR's commits, or say the per-task history is no longer observable post-squash. A run predating the footer convention gets "not observable", not a defect.

### 4. The pull request

```bash
gh pr list --search 'Plan-Id: <planId>' --state all --json number,title,url
gh pr view <n> --json isDraft,mergedAt,mergeCommitSha,commits,statusCheckRollup,createdAt,url
```

- **Draft state** — `ot-loop` leaves PRs in draft on purpose (`build` skips on drafts). A PR marked ready without a human asking is friction.
- **Push count** — the branch's CI runs. `gh run list --branch <branch>` gives the real number; one push at the end should mean one run. Each extra run is measurable waste worth quantifying.
- **Whether it exists at all.** No PR means either the run stopped early or the teardown rules were violated.

_Degraded:_ no `gh` auth, or the PR was never opened. Say which.

### 5. The work ledger

`get_work_sessions(planId)` — bounded, newest first — plus the artifacts attached to the plan. Sessions carry the tool and version that connected, the model, the actor and the start/end times, so this is also where dimension 7 gets its answer.

Was a `git_commit` artifact recorded for the merged squash, or is it owed? "Owed" is the normal state for a run that stopped at an open PR — that is correct behaviour, not a finding. A **merged** PR with no artifact is a finding.

_Degraded:_ sessions are opened best-effort by the MCP and can soft-fail. An absent session does not prove no work happened.

### 6. Model and cost attribution — a known hole

Say this plainly rather than guessing:

- **Queued/Ralph runs are attributable.** `plan_runs` carries `execution_backend`, `model`, `branch` and `checkout_id`, and the Ralph path opens a work session with `toolName: 'workflow-ralph'` and a real `model`.
- **Interactive `/ot-loop` runs create no `plan_runs` row**, so backend, branch and checkout are unavailable for them. What they _do_ leave is a work session: the MCP reports the connected client's own name and version (`claude-code`, `cursor`, …), and a model when the launcher set `OPENTHROTTLE_MCP_MODEL`. Read it with `get_work_sessions`. A session that says `openthrottle-mcp` with a null model means the handshake gave no client or no model was set — report that, do not infer one from writing style.
- **Token/cost is chat-only.** `agent_token_usage` is durable and normalized, and its table comment anticipates plan runs writing to it, but today only `ConversationStreamService` does — for chat turns. No plan run emits a row.

So dimension 7 answers **which agent and model** from the work sessions, and reports **cost** as not observable with that reason named. Backend, branch and checkout get sharper for free once plan `d8b857c0-c6ca-4828-9500-98ac16726bf1` gives interactive runs a real `plan_runs` row.

## The rubric — seven dimensions

Walk all seven, in order, every time. Each gets exactly one verdict: **clean**, **friction**, **defect**, or **not observable**. Look for the named signal; do not substitute a vibe check.

### 1. Setup

- Was the worktree created through [`ot-worktree`](../ot-worktree/SKILL.md) rather than a bare `git worktree add`? A bare add skips provisioning — ports, `.env`, compose isolation — and the symptoms show up later as a stale-`.env` password prompt or a port collision.
- Did it branch off the **intended** base? `ot-worktree` create branches off whatever the base checkout has checked out, not `main`. Check the branch's merge-base: unrelated commits at its root mean it inherited someone else's in-flight work.
- Was codegen run before tests? A fresh worktree needs `codegen-graphql` before app tests will collect.
- Did anything need healing by hand? Manual healing is friction the provisioner should have covered.

### 2. Per-task discipline

- **The one-`IN_PROGRESS` invariant.** Two tasks open at once is a defect. Corroborate the `updatedAt` overlap against commit timestamps before calling it — see the degraded path above.
- **Stranded tasks.** A task whose work demonstrably shipped (a commit carries its `Task-Id:`) but which is still `IN_PROGRESS` is _the_ documented #1 failure of this loop. Always check for it explicitly; never fix it.
- **Tasks added mid-run.** Not a failure — the loop is supposed to do this. It is a **planning-quality** signal: if a run added five tasks, the plan was underspecified, and that belongs in the review as feedback on planning, not on execution.
- **Order.** Execution should follow `sortOrder`. Jumping around usually means a dependency the plan did not encode.

### 3. Validation

- Is there evidence lint/typecheck/test ran **per task**, or only once at the end? The narration is the primary source; a single validation block right before the PR means the loop deferred it.
- Was any task marked `COMPLETED` on red? Search the narration for failures that were not followed by a fix.
- Were targets run **sequentially**? They share the Nx cache and parallel runs corrupt it. A single `nx affected --target=lint,typecheck,test --parallel` is friction with a real failure mode behind it.
- Beware the false negative: a passing run that never mentions validation may have validated silently. Report "not observable", not "skipped".
- **A requirement that genuinely could not be verified yet is not a completion on red.** Some checks are only possible after merge — a CI step does not run until it exists on `main`; a migration is not exercised until it is applied. A task that names the deferral, says why, and verifies everything reachable is **clean**. Score it as a defect only if the deferral was silent.

### 4. Commit and CI hygiene

- **One commit per task**, each carrying `Plan-Id:` and `Task-Id:`. Compare commit count to task count — but not naively: a task can legitimately touch no files at all (a one-time admin step, a decision recorded only in OT, a task that verifies rather than changes). Check what the task actually asked for before calling a missing commit a defect.
- **One push, at the end.** Count the branch's actual CI runs (`gh run list --branch <branch>`). Every run beyond the first is waste — quantify it rather than describing it, because "6 runs where 1 would do" lands and "pushed too often" does not.
- A mid-plan push is legitimate when the executor had to hand off or the worktree was at risk of being reaped. If the narration says so, it is not a finding.
- **No work-ledger artifact for intermediate commits.** The footers carry traceability; an artifact per work commit is noise on the ledger.

### 5. Finishing

- Was the branch squashed to one conventional commit, and rebased on a **freshly fetched** `main`? A soft reset against a stale `origin/main` silently reverts newer commits — check the squash's diffstat against the sum of the work commits.
- Is the PR **still a draft**? `build` skips on drafts, which is what keeps later pushes cheap. Marked ready without a human asking is friction.
- Was the plan flipped `COMPLETED` only after a re-fetch showed zero open tasks? This is the check that catches (2)'s stranded tasks, and skipping it is why they survive.
- Did the run stop at the open PR, without merging?

### 6. Teardown

- Was the worktree removed via `ot-worktree` destroy, and only **after** a confirmed PR? A bare `git worktree remove` skips `.worktree/teardown.sh`, leaving this worktree's docker compose project running, detached from any checkout — check for orphaned containers.
- Was the **branch preserved**? Both the open PR and the user's verification checkout depend on it. `--delete-branch` here is a defect.
- Was anything left unpushed or uncommitted at teardown? That is work loss.
- Is the ledger artifact recorded, or explicitly owed? For a run that stopped at an open PR, "owed" is correct — say so and move on.

### 7. Model and cost

Which backend and model executed this, and what did it cost? For a queued/Ralph run, read it off `plan_runs`. For an interactive run, read the client and model off `get_work_sessions` — and if the session reports `openthrottle-mcp` with a null model, say the launcher reported none rather than estimating. **Cost is not observable** for any run today; name the reason from the evidence section. Never infer a model from writing style.

## Friction is not the same as a defect

Both get reported; they mean different things and escalate differently.

- A **defect** is the loop doing something _wrong_: a stranded task, a completion on red, a deleted branch, a plan closed over open tasks. It has a correct behaviour it failed to produce.
- **Friction** is the loop doing the right thing _expensively_: six CI runs where one would do, a rebase that needed three attempts, a provisioning step that had to be healed by hand, narration dumped plan-level. Nothing is wrong with the output; the path to it was costly.

The distinction matters because it decides the escalation. A defect usually means a rule was missing or unclear — that becomes a proposed skill edit. Friction usually means real work is needed somewhere else — that becomes a plan.

## The report

Fixed sections, in this order. The shape is fixed so that two reviews of two runs are comparable to each other — a free-form essay per run tells you nothing about whether the loop is getting better.

```
# Loop review — <plan title> (<planId>)

<one sentence: what this run was, and how it went overall>

## Scorecard
| # | Dimension            | Verdict        | One line |
|---|----------------------|----------------|----------|
| 1 | Setup                | clean          | ... |
| 2 | Per-task discipline  | defect         | ... |
| 3 | Validation           | not observable | ... |
| 4 | Commit + CI hygiene  | friction       | ... |
| 5 | Finishing            | clean          | ... |
| 6 | Teardown             | clean          | ... |
| 7 | Model + cost         | not observable | ... |

## Findings
<one short block per non-clean dimension: what happened, the evidence for
it, and why it matters. Defects first, then friction.>

## Filed
<the follow-ups, each with its id or its proposed diff. "Nothing filed" is
a valid and common outcome.>
```

**Cap it.** Roughly one screen of scorecard plus a short block per finding. A `clean` dimension gets one line and no findings block — do not pad it to look thorough. A review nobody reads is worth nothing, and length is how reviews stop being read.

**Every finding cites its evidence.** A commit sha, a task id, a run count, a quoted line of narration. A finding you cannot trace back is a finding the next person has to re-derive.

### Where it lands

- **`append_plan_output(planId, ...)` as a plan-level chunk** — no `taskId`, because the review is about the whole run. It then sits in the stream alongside the narration it reviews, which is exactly where the next person looks.
- When reviewing a **task** id, still write the report plan-level, but scope the findings to that task and say so in the opening sentence.
- **`record_artifact` with type `document`** when the review has an external home worth linking.
- **Never a Markdown file under `docs/`.** Plans and their records live in OT. If the MCP is unavailable, fail loudly — do not fall back to a file.

## Escalation — what each finding becomes

Decide by what the finding _is_, not by how annoying it was.

**A rule the loop should have followed but the skill never stated → propose a skill edit.**
Write the proposed wording into the report. Do not apply it. Two constraints:

- The per-task discipline section in [`ot-loop`](https://github.com/openthrottle/monorepo/blob/main/skills/ot-loop/SKILL.md) is canonical, and it is deliberately restated in [`agents-ralph`](https://github.com/openthrottle/monorepo/blob/main/skills/agents-ralph/SKILL.md) because the `workflow-ralph` CLI injects that file as a standalone prompt with no access to the other. **Both must change together** — an edit to one alone silently forks the discipline between the interactive and queued paths.
- Edits land through a normal PR, reviewed by a human. This skill never edits `ot-loop`, `agents-ralph`, or itself. Fixing the loop from inside a review of the loop is how a rubric quietly rewrites itself to pass.

**Real product or infra work → `create_plan`, and link the id in the report.**
A missing MCP read, an unreliable provisioning step, a CI cost problem with a real fix. Never silently absorb it into this review and never fix it inline; the point of a review is to make the work visible, and work that gets quietly done during a review is work nobody scheduled or reviewed.

**A one-off environment gotcha → surface it, file nothing.**
A stale `.env`, a port collision, a flaky network call. Name it in the findings so the next reader recognises it, and stop there. Filing a plan per gotcha is how a backlog fills with noise until nobody reads it.

**Nothing at all → say so.**
"Clean run, nothing filed" is a real and good outcome. Manufacturing a finding to justify the review is the failure mode that makes rubrics worthless.
