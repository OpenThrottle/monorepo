# Plan and task tags, and the tag→action rules engine

How tags attach to plans, tasks and projects, and how a rule turns a tag
combination into an action. Source comments and migration comments point here by
section name, so the headings below are stable: rename one and the pointer that
cites it goes dead.

The code is the source of truth. Each section names the file that implements it.

## Overview

A plan carries tags (`breakdown`, `database`, `frontend`). A rule says "when a plan
carries these tags, do this": inject a `/grilling` task, switch a noisy skill off,
promote tasks into their own plans, or attach a prompt. Rules are evaluated in the
background whenever a plan changes, and every outcome is written to a ledger so
nothing runs twice.

```text
tags (plan, task, project)
  └─ effective tag set ──┐
                         ├─ evaluateTagActionRules ─ rankMatchedTagActions ─ executors ─ rule_applications
rules (per user) ────────┘                                                              (the ledger)
```

| Piece                 | Where                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| Vocabulary and tags   | `packages/openthrottle-skills/src/default-skill-tag-vocabulary.ts`, `services/tags/`              |
| Pure matching/ranking | `packages/openthrottle-skills/src/tag-actions.ts`, `rankMatchedTagActions.ts`                     |
| Worker and executors  | `applications/openthrottle-server/src/queues/plan-rules/`                                         |
| Plan-context reads    | `applications/openthrottle-server/src/services/plan-context-availability/`                        |
| Ledger                | `rule_applications` (migration 066), `packages/nestjs-repositories-server/.../rule-applications/` |

## One vocabulary, two dimensions

Every user has one tag vocabulary (`user_skill_tags`). Each tag in it lives in one of
two dimensions:

| Dimension | Meaning                           | Attaches to                    | Example                |
| --------- | --------------------------------- | ------------------------------ | ---------------------- |
| `domain`  | Subject area                      | skills, plans, tasks, projects | `database`, `frontend` |
| `phase`   | Lifecycle stage of a plan or task | plans, tasks, projects         | `breakdown`, `design`  |

Defaults seed on a user's first read from `DEFAULT_DOMAIN_TAG_VOCABULARY` and
`DEFAULT_PHASE_TAG_VOCABULARY`, and the user can edit them from there.

Why one vocabulary rather than two tables:

- **A tag name lives in exactly one dimension per user.** `UNIQUE (user_id, tag)` was
  left unchanged by migration 063 and spans both dimensions, so `breakdown` can never
  be both a subject and a stage. A rule that names a tag is therefore never ambiguous.
- **Skills stay domain-only.** A skill describes what it is about, not where in a
  plan's life it applies, so a phase tag never attaches to a skill.
- **A plan has at most one phase tag**, enforced by the tags service, not the
  database. A plan is in one stage at a time; two would let contradictory rules match.

Tags are kebab-case slugs. Rows carry the dimension denormalised from the vocabulary
at write time, with a `CHECK (dimension IN ('domain', 'phase'))`.

## Tag storage

Three attachment tables, same shape: `plan_tags` and `task_tags` (migration 064),
`project_tags` (migration 070).

| Column       | Notes                                                                            |
| ------------ | -------------------------------------------------------------------------------- |
| `tag`        | Kebab-case, `CHECK`ed. No foreign key (see below).                               |
| `dimension`  | `domain` or `phase`, copied from the vocabulary row at write time.               |
| `source`     | `human`, `agent` or `server-llm`. Never caller-supplied (see Provenance ladder). |
| `confidence` | Optional, for tags a model proposed.                                             |

`tag` has no foreign key to the vocabulary. The service validates it on write, and a
later vocabulary edit does not break existing attachments. A tag that has fallen out
of the vocabulary simply stops matching anything, which is the same graceful
degradation rule `tag_all` uses ("unknown tags never match").

One row per `(entity, tag)`; adding a tag that is already present is a no-op. Project
tags have no one-phase limit, because that limit is a plan-level rule.

## Tag model

`TagsService` (`applications/openthrottle-server/src/services/tags/tags.service.ts`)
is the only writer. It resolves the caller's identity, derives `source` from it,
validates the tag against the caller's vocabulary, and enforces one phase tag per plan.

The **effective tag set** is what rules match against:

| Context                         | Effective set                                                          |
| ------------------------------- | ---------------------------------------------------------------------- |
| Plan (rule evaluation, preview) | plan tags ∪ tags of the plan's live tasks ∪ tags of the plan's project |
| One task (plan-context reads)   | that task's tags ∪ the plan's tags ∪ the project's tags                |

Tags are deduplicated by name; when the same tag
arrives from several rows, the highest-provenance row is kept for display, and an
equal-rank tie goes to the broader scope (task, then plan, then project).

Project tags exist so a whole project can opt into a rule without tagging every plan.
They widen a plan's effective set; they are not a rule scope. Scope is covered under
Rules engine.

## Provenance ladder

`source` records who wrote a tag, and it is derived from the authenticated principal:

| Principal                                | `source`     |
| ---------------------------------------- | ------------ |
| A signed-in user (developer app)         | `human`      |
| The dedicated tagging service account    | `server-llm` |
| Any other service account (MCP, runners) | `agent`      |

The ladder is `human > agent > server-llm`. It decides two things: whether a caller
may **replace** an existing phase tag (equal or lower provenance may; a higher one
rejects the write) and whether a caller may **remove** a tag (it cannot remove a row
that outranks it). The point is that a model's guess never overwrites a human's
decision. `source` is never accepted from client input, because a field a caller can
set is a field a caller can lie in. See `tag-source.constants.ts` in
`nestjs-repositories-server`.

## Rules engine

A rule is a row in `tag_action_rules` (migration 065), owned by one user, with a
match half and an action half.

**Match.** All of these must hold (AND semantics), checked by the pure
`evaluateTagActionRules`:

| Condition       | Rule value                           | Passes when                                                        |
| --------------- | ------------------------------------ | ------------------------------------------------------------------ |
| enabled         | `true`                               | always required                                                    |
| `tag_all`       | list of tags                         | every listed tag is in the effective set; empty matches every plan |
| `status`        | plan status or NULL                  | NULL, or equal to the plan's status                                |
| `repository_id` | repository or NULL                   | NULL, or equal to `plans.repository_id`                            |
| `environment`   | `ci`, `interactive`, `ralph` or NULL | NULL, or equal to the evaluation's environment                     |
| `project_id`    | project or NULL                      | NULL, or equal to the plan's project                               |

The evaluator returns every match in input order. It does no I/O, so the same function
backs the worker, the plan-context read and the preview.

### Scope ladder

Scope is "which plans does this rule apply to, and how narrowly". From broadest to
narrowest:

1. **Global**: no repository, no environment, no status.
2. **Repository**: `repository_id` set (migration 189). The rule only matches plans in
   that repository.
3. Further qualifiers on top of either: an `environment`, a `status`, and each extra tag.

The repository rung needs a real column on plans. `plans.repository_id` (migration 188) is **derived by a trigger** from `run_config -> workspace -> repositoryId`. It is
never written by a client: every path that saves a plan, whether the server, task
promotion, the node client or raw SQL, goes through the same trigger, so there is one
writer and the two values cannot drift. The trigger keeps a value only if it is a UUID
naming an existing repository, and leaves anything else NULL, so a stale run config
cannot fail a plan save. If the repository is deleted, `plans.repository_id` becomes
NULL and a repository-scoped rule stops matching that plan. A rule's own
`repository_id` cascades instead: deleting the repository deletes its rules, because
quietly widening a repository-scoped rule to every repository would be wrong.

`tag_action_rules.project_id` is still matched when set, but it is **not scored** and
the UI does not offer it. It is reserved for cross-repo Projects (see Not yet).

### Specificity ordering

When several rules match, `rankMatchedTagActions` orders them narrowest first. The
score is `scoreTagActionSpecificity`:

| Qualifier             | Points |
| --------------------- | ------ |
| Repository            | 2      |
| Environment           | 1      |
| Status                | 1      |
| Each tag in `tag_all` | 1      |

Ties break on rule `createdAt` ascending (oldest first), then rule id, so the order is
stable between evaluations. `projectId` scores nothing: a project and a repository do
not nest (a project spans repositories), so ranking one against the other needs a
decision the Projects model has to make.

Ranking only orders; it never drops a match. What "narrowest wins" means is decided per
action type, below. The same `scoreTagActionSpecificity` feeds the `/rules` table
ordering, so the screen and the engine cannot disagree.

### How a pass runs

Mutations that change a plan (create, status change, task created, tag add/remove,
project tag change) enqueue a `plan-rules:evaluate` job after their own write commits.
Enqueue failures are logged and swallowed, because a tag write must not fail when Redis
is down; the next trigger re-evaluates the whole plan anyway.

`PlanRulesProcessor` runs one full pass per job:

1. Load the plan and resolve its owner from `plan.author`. No user row for the author
   means no rules, and the pass is skipped.
2. Load the effective tag set and the owner's enabled rules; run the evaluator.
3. Look up the ledger row for each match. A row in any state means no fresh dispatch.
4. Arbitrate `inject-task` duplicates (see Action type 2).
5. Dispatch fresh matches to their executors.
6. Reconcile already-applied matches and re-inject rows whose result is gone.
7. Orphan applied rows whose rule no longer matches.

Passes are deduplicated per plan **and environment** (`keepLastIfActive`), so a burst of
edits collapses into one pass. The environment is in the key because rules apply once
per `(rule, plan)`: a null-environment pass replacing a pending `ralph` one would drop
the `ralph`-only matches.

**The environment is on the job, and no trigger supplies one yet.** Every current
trigger passes `null`. An environment-qualified rule therefore does not match a worker
pass today; it takes effect only on plan-context reads, where the caller declares its
environment (Ralph says `ralph`, the developer app `interactive`, CI `ci`). That is why
the rule form tells users to leave environment blank for a rule meant to inject or
promote tasks.

## Action types

Four types, all in `TAG_ACTION_TYPES`, with a Zod payload schema each, validated when
the rule is written so the worker can trust stored payloads. The `action_type` check
constraint was widened to all four in migration 187 (before it, a
`promote-task-to-plan` rule failed at insert).

| Type                     | Does                                               | Arbitration between matches                    |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------- |
| `availability-exception` | Allow or deny skills, for this plan's context only | Layered by specificity; narrowest verdict wins |
| `inject-task`            | Adds a task that runs a skill                      | Same skill and placement: narrowest wins       |
| `promote-task-to-plan`   | Promotes tagged tasks into new plans               | None; additive                                 |
| `attach-prompt`          | Attaches a prompt or persona to the plan           | None; additive                                 |

### Action type 1

`availability-exception`. Payload: `tagAllow`, `tagDeny`, `slugAllow`, `slugDeny`
(domain tags and skill slugs). The exception is **ephemeral**: on a plan-context read
(`PlanContextAvailabilityService`) the matched payloads become extra resolver rules
appended to the project's stored rule set for that read only, and are never written to
`skill_availability_rules`. Reading a plan therefore cannot change a project's saved
configuration.

Precedence runs through `resolveSkillAvailability`:

- Rules are grouped into **layers by specificity** and the layers are walked from
  narrowest to broadest. The first layer with any verdict for the slug or tag decides,
  so a repository-scoped allow overrides a global deny.
- **Within one layer, deny wins.** Two equally specific rules disagreeing resolves
  towards "off", the safe default.
- Rules in the project's **persisted rule set carry no score**, so they sit in the
  broadest layer (0). A scoped exception can override them; an unscoped, tagless
  exception shares their layer, and deny wins there.
- Evaluating an exception uses the plan's environment from the read, which is how
  environment-scoped exceptions work today.

The `inject-task` executor reads availability this way too: it refuses to inject a
skill that is unavailable in the plan's context.

### Action type 2

`inject-task`. Payload: `skillSlug`, `placement` (`first`, `last`, `before`, `after`;
the last two need an `anchor` of exactly one of `taskId`, `skillSlug`, `titleMatch`),
and optional `titleTemplate` / `descriptionTemplate` (`{{plan.title}}`, `{{plan.id}}`,
`{{matchedTags}}`).

The executor, for a first-time `(rule, plan)` pair:

1. **Pre-satisfied** if a task already references `/<skillSlug>` in its title or
   description, in any status including completed. Nothing is injected.
2. **Flagged** `skill-unavailable` if the skill is missing or switched off in this
   plan's context.
3. Otherwise inserts the task at the placement and records it **applied** with the new
   `task_id`. The description carries a footer naming the rule and matched tags.

Injection happens once, but placement is a managed invariant: each later pass
`reconcile`s an applied task back to its placement, so a `last` task stays last as
tasks are added.

**Duplicate injections.** If several matched rules would inject the same skill at the
same placement (and anchor), only the narrowest is dispatched
(`findSupersededInjectTasks`). Each loser without a ledger row gets a **flagged** row
with `{reason: 'superseded-by', ruleId: <winner>}`. A winner that already applied still
supersedes a fresh broader duplicate. This is the "injections are deduped" behaviour:
without it, a global rule and a repository rule for the same skill would add the task
twice.

### Action type 3

`promote-task-to-plan`. Payload: an empty object. Promotes every not-yet-promoted task
in the plan that carries one of the rule's matched tags, through the same
`TaskPromotionService` the explicit mutation uses. Records **applied** with the promoted
task ids, or **flagged** `no-eligible-task` when nothing qualified. It is unranked:
promotions are additive and idempotent per task.

### Action type 4

`attach-prompt`. Payload: exactly one of `promptId` or `filePath`; `promptType`
(`prompts` or `personas`; `rules` was retired with migration 111); `placement`
(`start` or `end`, default `end`).

A `filePath` reference is the `(file_path, prompt_type)` natural key from migration 048,
so a rule keeps working when the same prompt has a different id in another database.

**Prompt resolution order.** The executor resolves the prompt among _live_ rows the
**rule owner** can see, which is their own rows plus system rows (`user_id IS NULL`):

1. By `promptId`: that row, if it is live and visible.
2. By `filePath` and `promptType`: the owner's row if one exists, otherwise the system
   row. A user row beats a system row for the same path.
3. The resolved row's `prompt_type` must equal the payload's `promptType`.

Another user's prompt, a soft-deleted one and a missing one are deliberately
indistinguishable and all end in **flagged** `prompt-unavailable`; a dangling reference
records a visible row instead of throwing and stalling the plan. The same
visibility applies to the prompts API: reads return the caller's rows plus system rows,
writes touch only the caller's own, and system rows are read-only through the API
because the agent-asset ingest owns them.

Outcomes for a first-time pair:

| Outcome                                                    | Ledger state  | `details`                                                      |
| ---------------------------------------------------------- | ------------- | -------------------------------------------------------------- |
| Payload fails the schema (defensive; write-time validated) | flagged       | `reason: invalid-payload`                                      |
| Prompt not resolvable                                      | flagged       | `reason: prompt-unavailable`                                   |
| Another applied rule already attached this prompt id       | pre-satisfied | `reason: already-attached`, `promptId`, `ruleId` of the first  |
| Otherwise                                                  | applied       | `placement`, `promptId` (always the resolved id), `promptType` |

There is **no attachment table**: the ledger row is the attachment. There is nothing
to reconcile or re-inject. Attachments are additive and unranked; a second rule
attaching the same prompt is recorded pre-satisfied, never superseded.

## Executor contract

An executor (`ActionExecutor`, `action-executor-registry.types.ts`) registers itself
with `ActionExecutorRegistry` and implements:

| Method      | Required | When the worker calls it                                                                                             |
| ----------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `execute`   | yes      | A match with no ledger row for `(rule, plan)`                                                                        |
| `reconcile` | no       | A match whose row is `applied` with a live task, every pass, to hold a managed invariant (inject-task placement)     |
| `reinject`  | no       | A match whose row is `applied` with a deleted task, or `orphaned`, so a still-matching rule is not a permanent no-op |

Rules for executors:

- **Never arbitrate.** The worker ranks matches and removes superseded ones before
  dispatch, so an executor never sees a loser.
- **Always leave a ledger row**, including for a refusal. A flagged row is how a
  blocked rule becomes visible.
- **Never throw for a state the user can fix** (missing skill, unavailable prompt).
  Record `flagged` with a reason.
- **Be idempotent anyway.** The worker checks the fingerprint, but delivery is
  at-least-once and passes for different environments can overlap.

### The ledger

`rule_applications` (migration 066) has one row per `(rule, plan)`, enforced by
`UNIQUE (rule_id, plan_id)`.

| State           | Meaning                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| `applied`       | The action was performed.                                                      |
| `pre-satisfied` | The plan already satisfied the rule when first evaluated, so nothing was done. |
| `flagged`       | The rule matched but did not act. `details.reason` says why.                   |
| `orphaned`      | The rule was applied, then stopped matching.                                   |

Known `details.reason` values:

| Reason               | State         | From                                               |
| -------------------- | ------------- | -------------------------------------------------- |
| `existing-task`      | pre-satisfied | inject-task found a task already running the skill |
| `already-attached`   | pre-satisfied | attach-prompt                                      |
| `revived`            | applied       | inject-task reopened a previously orphaned task    |
| `skill-unavailable`  | flagged       | inject-task                                        |
| `no-eligible-task`   | flagged       | promote-task-to-plan                               |
| `invalid-payload`    | flagged       | attach-prompt                                      |
| `prompt-unavailable` | flagged       | attach-prompt                                      |
| `superseded-by`      | flagged       | worker, with the winning `ruleId`                  |

**Apply-once fingerprint.** A row in any state for `(rule, plan)` means the worker
does not dispatch that pair again. This is what makes redelivered jobs, overlapping
passes and a deleted injected task safe: the fact that the rule already ran survives
the thing it produced. It is also why a flagged row stays flagged after the user fixes
the cause, such as creating the missing prompt: the row is the record that the rule
was already considered for this plan. Matching plans created or evaluated later get a
fresh row.

**Never-undo rule.** The engine adds, it does not take back. Nothing a rule did is
deleted when the rule stops matching, is disabled or is deleted:

- Orphaning flips the row's state. For `inject-task` it also soft-closes the injected
  task to `SKIPPED`, unless the task is already terminal or a human deleted it. That
  is reversible bookkeeping, not removal: if the rule matches again, `reinject`
  revives the same task. Promoted plans and attached prompts are left exactly as they
  are.
- A human deleting an injected task sets the row's `task_id` to NULL and leaves the
  row, so the rule is not re-applied behind their back; a still-matching rule can
  re-inject on a later pass.
- Soft-deleting a rule (migration 179) keeps its ledger rows, which stop being
  evaluated. Prefer disabling a rule to deleting it for the same reason: the history
  stays readable.

## Surfaces

**Developer app** (`applications/openthrottle-developer/app/routing/rules/`):

- `/rules`: the rules table grouped by scope, Global first and then one group per
  repository (alphabetical), plus a catch-all for rules pointing at a repository the user
  no longer lists. Each group is ordered narrowest first, with a scope filter.
- `/rules/:id`: the rule, its applications from the ledger (state and reason
  labels, with flagged and orphaned rows called out), and the preview.
- The rule form: title, tags (domain and phase), status, environment, a repository
  select ("Any" leaves it global), the action fields (for `attach-prompt`, a picker over
  the prompts and personas the user can see, marked Yours or System) and a live preview
  that updates as the form changes.
- **Preview** runs the real evaluator over the user's most recently updated plans
  (capped at 500; the response says when it truncated) and, for plans that do not match,
  explains each condition (`explainTagActionRuleMatch`). It writes no ledger row and
  dispatches nothing. A rule that fails only on environment is called out as one that
  would apply on a run carrying that environment.

**MCP** (`packages/openthrottle-mcp/src/tools/tag-action-rules.ts`, admin toolset):
`list_tag_action_rules`, `upsert_tag_action_rule`, `delete_tag_action_rule`,
`preview_tag_action_rule`, `list_rule_applications`.

## Not yet

- **No trigger supplies an environment.** Every worker pass carries `null`, so
  environment-qualified rules apply only on plan-context reads. A trigger opts in by
  passing its environment to `enqueueEvaluation`; the dedup key already separates
  environments.
- **Attached prompts are not composed into agent context.** An `attach-prompt` rule
  records the attachment in the ledger, and `placement` is stored, but nothing reads the
  ledger to build an agent's context yet.
- **"User prompt beats system prompt" cannot be reached today.** Migration 048's unique
  index on `(file_path, prompt_type)` is global and deliberately covers soft-deleted
  rows (migration 179 notes why), so a user row and a system row for the same path
  cannot coexist. The preference is implemented in `findVisibleByFilePath` and will
  take effect when that index is scoped per owner.
- **Cross-repo Projects.** `project_id` is matched when set but unscored and not
  offered in the UI. Projects span repositories and do not nest with repository scope,
  so how a project rule ranks against a repository rule is left to that model.
- **No automatic retry of flagged rows.** A flagged row stays flagged after its cause
  is fixed (see the apply-once fingerprint).
