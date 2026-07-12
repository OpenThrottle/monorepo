# Plan/task tags & the tag→action rules engine — design

**Status:** design approved, pending implementation.
**OT plan:** `a8c1bc53-bef6-441a-a766-f74348fb0639` — "Tags & rules on plans/tasks: lifecycle phases, LLM domain tagging, and tag→action rules engine".
**Companion (shipped) mechanism:** `9a58dbe9-9cdb-4269-bfa0-108381965519` — context-aware skill availability ([design doc](./skill-availability-design.md), PRs #179/#181). This plan is the task-injection follow-on that plan carved out of its scope.

All structural decisions below were resolved in grilling + Q&A sessions on 2026-07-12 (14 decisions, recorded in the OT plan description). This doc is the consolidated proposal; the per-task design writeups live on the plan's output stream.

## Overview

Plans and tasks gain **tags** in two dimensions, applied by a hybrid LLM/agent/human pipeline, and a **declarative rules engine** maps tag combinations to actions. Two v1 action types: plan-aware **skill availability** (read-time, via the shipped resolver) and **require/inject-a-task** (e.g. a `breakdown` plan must start with `/grill-me`).

```
create_plan ──▶ predict-tagging job ──▶ plan_tags (source=server-llm)
link_commit ──▶ refine-tagging job ──▶ reconcile tags vs squash diff
agents/humans ─▶ tag mutations (MCP/GraphQL, source=agent|human)
                        │
                        ▼  tag-changed / created / status-changed events
              plan-rules:evaluate (BullMQ)
                        │  evaluateTagActionRules (pure)
                        ▼
       ┌────────────────┴───────────────────┐
  inject-task executor              availability-exception
  (ledger-fingerprinted)            (ephemeral resolver input)
       │                                     │
       ▼                                     ▼
  new OT task                 get_skill_availability(planId, taskId)
```

## Tag model

### One vocabulary, two dimensions

The vocabulary stays in `user_skill_tags` (per-user, seeded on first read from the committed default) and gains a dimension column:

```sql
ALTER TABLE user_skill_tags
  ADD COLUMN dimension TEXT NOT NULL DEFAULT 'domain'
  CHECK (dimension IN ('domain', 'phase'));
```

- The existing `UNIQUE (user_id, tag)` deliberately spans dimensions: a tag name exists in exactly one dimension per user (`breakdown` can never be both).
- `DEFAULT_SKILL_TAG_VOCABULARY` splits into `DEFAULT_DOMAIN_TAG_VOCABULARY` (current 16 entries) and `DEFAULT_PHASE_TAG_VOCABULARY`; seed shape becomes `{ tag, dimension }[]`.

| dimension | semantics               | attaches to          | seed                                                               |
| --------- | ----------------------- | -------------------- | ------------------------------------------------------------------ |
| `domain`  | what it touches         | skills, plans, tasks | the current 16 (`infra`, `terraform`, `backend`, …)                |
| `phase`   | what kind of work it is | plans, tasks only    | `breakdown`, `design`, `implementation`, `maintenance`, `research` |

**Phase complements status; it never mirrors it.** `status` remains the only run-state source of truth; there is no phase state machine or transition logic. Rules match on tags AND status together (e.g. `breakdown` AND `PENDING`). At most one phase tag per plan (service-enforced). Skills can never take phase tags (write-time dimension assert).

Naming: kebab-case singular (existing CHECK). No prefixes — the dimension column carries the axis. Known hazard, accepted: domain seed entries `planning`/`commit`/`pr-review` are skill subject areas, not phases; the one-name-one-dimension constraint keeps this mechanical.

### Attachment: `plan_tags` / `task_tags`

Two join tables (not category reuse, not a JSONB column):

- `id`, `plan_id`/`task_id` FK CASCADE, `tag` TEXT (service-layer validated against the caller's vocabulary — no FK, mirroring `project_skills.tags`), `dimension` TEXT CHECK (denormalized), `source` TEXT CHECK (`human` | `agent` | `server-llm`), `confidence` NUMERIC NULL, timestamps.
- `UNIQUE (plan_id, tag)` / `UNIQUE (task_id, tag)`.

**Effective tag set** (what rules and availability reads consume): plan-context = plan tags ∪ its tasks' tags; task-context (a Ralph run of one task) = task tags ∪ plan tags. Dedupe by tag name; highest-provenance source wins for display.

### Provenance ladder

`human > agent > server-llm`. Source is **derived from caller identity, never caller-supplied** (service account → `server-llm`, agent token → `agent`, developer-app session → `human`). Automated refinement adds freely but removes only its own `server-llm` rows; disagreement with higher-provenance rows is logged, not applied. Humans can remove anything.

## Tagging pipeline (hybrid)

Two BullMQ jobs in `openthrottle-server`, enqueued after the owning transaction commits, authenticated as the **tagging service account** (whose own `user_skill_tags` rows — seeded from the committed default, expandable via existing CRUD — bound what automation may apply). LLM calls go through a `TaggingModelProvider` seam: hosted small model by default, local/Ollama behind the same interface.

1. **predict-tagging** — on `create_plan` / `create_task`. Closed-vocabulary classification of title+summary+description → strict JSON `{ tags: [{ tag, dimension, confidence }] }`, 0–5 domain + ≤1 phase; out-of-vocabulary entries dropped server-side; Zod-validated, one retry, then skip. Auto-applies with `source=server-llm`; confidence stored, non-gating in v1.
2. **refine-tagging** — on `link_commit` (the landed-squash boundary). Fetches the squash diff, asks for the evidenced domain set (never phase), reconciles under the ladder: insert missing, delete own stale rows, leave-and-log higher-provenance disagreements.

Both jobs are replace-own-rows idempotent (`tag-predict:<type>:<id>` / `tag-refine:<planId>:<sha>` job ids). Agents/humans write through new mutations `add_plan_tag` / `remove_plan_tag` / `add_task_tag` / `remove_task_tag`.

## Rules engine

### Tables

**`tag_action_rules`** — `id`, `user_id` FK (workspace-owned, like the vocabulary), `project_id` NULL FK (NULL = all projects), match criteria (`tag_all TEXT[]` conjunctive — OR = write two rules; `status` NULL = any; `environment` NULL = all, CHECK `ci|interactive|ralph`), `action_type` CHECK (`inject-task` | `availability-exception`; extensible), `action_payload JSONB` (Zod discriminated union per type), `enabled`, timestamps.

**`rule_applications`** (the ledger) — `id`, `rule_id` FK CASCADE, `plan_id` FK CASCADE, `task_id` NULL FK SET NULL, `state` CHECK (`applied` | `pre-satisfied` | `flagged` | `orphaned`), `details JSONB`, timestamps, **`UNIQUE (rule_id, plan_id)`** — the apply-once-ever fingerprint, DB-enforced.

### Evaluation

A pure `evaluateTagActionRules(context, rules): MatchedAction[]` (zero I/O, `resolveSkillAvailability` precedent). Triggered event-driven via a `plan-rules:evaluate` BullMQ job on: tag attach/remove/replace, plan/task create, status change. At-least-once delivery is safe because executors are idempotent. No global rule priority — conflict semantics are per action type: inject-task is additive; availability-exception composes through the shipped deny-wins ladder.

### Executor contract (idempotency / un-match)

1. Ledger row exists for (rule, plan) in any state → do nothing.
2. World already satisfies the action on first evaluation → write `pre-satisfied`.
3. Action blocked by its own gating → write `flagged` with details.
4. Rule stops matching after an `applied` row → flip to `orphaned`; **never undo the action**. Orphaned/flagged rows are the developer-app surfacing queue.

## Action type 1: plan-aware skill availability

Read-time only — mutates nothing, stays informational (parity with the shipped v1):

- `get_skill_availability` gains optional `planId` / `taskId` (task must belong to plan). The server assembles the effective **domain** tag set, runs the shipped resolver unchanged (plan context never alters `effectiveDisableModelInvocation`), and annotates each skill: `matchedPlanTags: [String!]!`, `planRelevant: Boolean!`, provenance suffix `plan-context: matched [infra, terraform]`. Optional `relevantOnly: Boolean = false` filters.
- `availability-exception` rules (payload: `tagAllow/tagDeny/slugAllow/slugDeny`, domain dimension) are **not persisted** into `skill_availability_rules`; matched actions are materialized as ephemeral rule inputs appended to the resolver's rule list for that read only, arbitrated by the shipped deny-wins ladder.

The annotated, optionally filtered skill list is the **resolved candidate set** consumed by inject-task gating and Ralph context assembly.

## Action type 2: require/inject-a-task

Payload: `{ skillSlug, placement: 'first' | 'last', titleTemplate?, descriptionTemplate? }` (templates interpolate `{{plan.title}}`, `{{plan.id}}`, `{{matchedTags}}`).

Executor, in a transaction: fingerprint check → pre-satisfied check (existing task referencing `/<skillSlug>`, any status → `pre-satisfied`) → candidate-set gating (slug unavailable in plan context → `flagged`, never a dead task) → inject (placement `first` = MIN(sort_order) − 1000 with reorder fallback on the `(plan_id, sort_order)` UNIQUE; `last` = MAX + 1000; provenance footer in the description) → ledger `applied`.

Edges: human deletes the injected task → no re-inject (fingerprint holds; deletion is a permanent veto). Triggering tag removed → row flips `orphaned`, task untouched. Rule deleted → ledger CASCADEs; a recreated rule may re-inject (documented).

**Dogfood case:** this very plan — auto-tag `breakdown` at create → rule injects `/grill-me` first. The plan's manually created grill task (sortOrder 500, completed 2026-07-12) is exactly a `pre-satisfied` ledger row.

## Recommended next steps: implementation backlog (not a spike)

The riskiest unknowns were retired by design against shipped machinery; a throwaway spike would mostly re-verify things the availability v1 already proved (pure-resolver topology, vocabulary validation, BullMQ jobs). Recommended slices, each a PR-sized task in a follow-on implementation plan:

1. **Schema + vocabulary dimension** — migrations for `plan_tags`, `task_tags`, `user_skill_tags.dimension`, `tag_action_rules`, `rule_applications`; dimensioned seed consts in `@openthrottle/openthrottle-skills`.
2. **Tag CRUD + effective-set service** — entities/services in `nestjs-repositories`, GraphQL/MCP mutations with identity-derived source, ladder enforcement, dimension asserts.
3. **Rules engine** — pure evaluator + Zod payload schemas (shared package), `plan-rules:evaluate` worker, executor registry, ledger.
4. **Inject-task executor** — the algorithm above, including candidate-set gating.
5. **Plan-aware availability read** — `get_skill_availability` context extension + annotations + `relevantOnly`; ephemeral exception-rule input.
6. **Tagging jobs** — `TaggingModelProvider` seam, predict + refine jobs, service-account vocabulary bootstrap.
7. **Developer-app surfacing** — tags on plan/task views, orphaned/flagged application queue, rules editor (last; everything above is headless-first).

Slices 1–4 deliver the dogfood rule end-to-end; 5–6 complete the loop; 7 is UX. GraphQL changes are additive throughout (no deprecations needed). After merge, run the schema/codegen flow (`schema.gql` + `__generated__`) per CLAUDE.md.
