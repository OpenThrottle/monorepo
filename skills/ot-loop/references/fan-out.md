# Intra-task fan-out

Loaded from `ot-loop` § Intra-task fan-out. Step 2 — and only step 2 — may be worked by several agents in parallel. Exactly one task stays `IN_PROGRESS`, and the parent turn still owns every status flip, validation, and the single commit with its one `Task-Id:` footer. It is not task-level parallelism and adds no second delegable step.

## Eligibility test

A task is fan-out eligible only when its work decomposes into units with **disjoint file sets** — no two units write the same file — and no shared invariant couples them. Disjoint files are necessary, not sufficient: a shared assertion, contract or generated artifact is coupling even when file sets do not overlap.

- **Eligible:** re-pointing ~10 doc files across `docs/`, `.agents/personas/` and the developer UI copy. One file per unit, a clean partition.
- **Not eligible:** implementing the prompt-layer mechanism in both the orchestrator and the CLI while asserting both produce the same shape. The files may be disjoint, but the shared assertion couples them.

When a task doesn't clearly pass, don't fan it out; the parent doing step 2 itself is the safe fallback.

## What a fan-out agent may not do

Each agent owns exactly one disjoint unit and reports back. It must never:

- Mutate OT status (`update_task`, `update_plan`, `begin_task_session`, any OT write).
- Commit or push.
- Run an `nx` target for any project. Concurrent `nx` targets in the same checkout contend on the shared `.nx` cache and produce spurious failures at scale (a suite that passed 1076/1076 alone showed dozens of unrelated failures beside a build and a lint). Fan-out agents write files; they never validate them.

## Validation stays serialized in the parent

Once every unit rejoins, the parent runs `pnpm nx affected --target=lint,typecheck,test` **sequentially**, as for any task.

## Model tier and concurrency cap

Fan-out agents default to the cheap (`default`) tier. Escalation stays per task, never per fleet.

- **Cheap-tier fan-out agents: at most 4 at once.** A starting point; tune it in [model-routing.json](./model-routing.json).
- **Non-default-tier agents: at most 1**, the loop-wide cap (`guardrails.maxConcurrentNonDefaultTierAgents`), re-decided explicitly for fan-out and unchanged.
