# Model routing details

Loaded from `ot-loop` § Model routing. The lookup itself is in SKILL.md; the policy data is [model-routing.json](./model-routing.json) (its `guardrails` block is the normative copy, and `READ_COST_CORRECTLY` explains the cost axis). Rationale and measured reach: [per-task-model-routing.md](https://github.com/openthrottle/monorepo/blob/main/docs/openthrottle/per-task-model-routing.md).

Most tasks land on `default`, by design. Routing and attribution must agree: what you pass as the Agent tool's `model` and what you declare to `begin_task_session` name the same tier.

## The delegation prompt must stand alone

A subagent inherits none of your context. Build the prompt from the task row alone:

```
<task title>

<task description — verbatim; real rows carry file paths and line numbers>

Acceptance criteria (from the task's requirements):
- <requirementsJson[0]>
- <requirementsJson[1]>
...

Repo rules that apply: generators before hand-writing, no `as` casts or `any`, no deep package
imports, `import type` at the top level. Validate with the project's own nx targets, run
sequentially. Report what you changed and what you could not.

Do NOT change any OpenThrottle plan or task status, and do NOT commit — the caller owns both.
```

A well-formed OT task already carries what a worker needs: `description` says what and where, `requirementsJson` is the acceptance criteria. If the row is too thin to delegate from, that is a signal about the row, not a reason to paste your own context in. Do the task in the parent turn and say so.

## Cost guardrails

- **At most 1 non-default-tier agent at a time.** Structurally enforced: the loop runs one task at a time and delegates at most one subagent per task. Anything that adds fan-out or parallel lanes must re-decide the number for non-default tiers explicitly.
- **Automatic routing can never select the most expensive model.** No category maps to the `review` tier, so the fable path does not exist in the lookup. This is the load-bearing guardrail.

Advisory rules (prose):

- **Escalation is per task, never per fleet.** There is no "this plan is hard, run it all on opus".
- **Split mixed batches by difficulty.** Never route a whole batch at its hardest item's tier.
- **Finish a finite mechanical tail in the main loop** rather than re-spawning for it.

## Headless runners

The OT Loop job routes each task by this same policy (loaded from the OT root), falling back to the run's model when its driver does not list the tier's, and records whichever model it passed. A run whose config pins a model keeps that model for every task, and each task should still declare it via `begin_task_session`.
