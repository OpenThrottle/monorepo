# Context-aware skill availability — design

> Status: **reviewed design** (decided 2026-07-11, grilling session; OT plan
> `9a58dbe9-9cdb-4269-bfa0-108381965519`). This document is the interface the plan's
> implementation tasks build against. Current-state audit:
> [agent-skills-pipeline-findings.md](./agent-skills-pipeline-findings.md).

## Problem

Every skill's frontmatter may declare `disable-model-invocation` — suppress **automatic
(model-initiated)** invocation while leaving explicit human `/skill` invocation untouched.
Today the value is static, hand-edited, parsed by `@openthrottle/openthrottle-skills`, and
then discarded: no OT surface displays it, no consumer resolves it per context. There is no
way to express "in the infra project, only GitHub/Terraform skills should be model-invocable"
or "under Ralph, use a different cut than interactive editing."

## Scope

- **In**: computing, displaying, and exposing a per-context _effective_
  `disable-model-invocation` for every skill — tags, per-project rules, a pure resolver, a
  GraphQL/MCP surface, and developer-app display + authoring UI.
- **Out (follow-on plan)**: a suggestion/task-injection engine that reads a plan's tasks and
  injects skill-tasks (e.g. `/github-commit`, `/pr-review`) into OT plans. It consumes this
  plan's resolved candidate set.
- **v1 is informational.** Nothing in v1 changes what an agent runtime auto-invokes.
  Enforcement — materializing resolved frontmatter into synced repos — is the plan's backlog
  task and depends on the yaml _writer_ this plan introduces.

## Invariants

1. **Resolve-at-read.** The SSOT frontmatter under `.agents/skills/` is never rewritten by
   resolution. (The backlog enforcement task writes only to synced _target_ repos.)
2. **Human invocation is never gated.** All of this concerns model auto-invocation only.
3. **No config ⇒ passthrough.** A project with no rules resolves every skill to its static
   frontmatter value. Zero-cost, zero-surprise; the common case.
4. **Unknown tags degrade gracefully.** A frontmatter tag absent from the active workspace
   vocabulary is ignored with a warning, never a hard failure — a workspace must not be able
   to break resolution of a repo it doesn't control.

## Attribute model

| Axis             | v1             | Source                                                                                                                                                                                                                     |
| ---------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project`        | **wired**      | the OT project the caller asks about (`projectId`)                                                                                                                                                                         |
| `environment`    | **wired**      | caller-supplied `interactive \| ralph \| ci` (`as const`; default `interactive`). The server cannot sniff the caller's process env — each caller declares its own (Ralph passes `ralph`, the developer app `interactive`). |
| `editor`         | reserved-inert | nullable column exists; resolver ignores it                                                                                                                                                                                |
| `role` (persona) | reserved-inert | nullable column exists; resolver ignores it                                                                                                                                                                                |

Rules reference skills by **tag** (primary) and **slug** (exceptions). Adding editor/role
later is additive — no migration, no signature change.

## Tags

- Skill frontmatter gains `tags: string[]` (`skillFrontmatterSchema` stays `.strict()`).
  Zero tags is legal. Assignments live in the SSOT frontmatter.
- **Prerequisite**: migrate `parse-yaml-frontmatter.ts` to the `yaml` package — the
  hand-rolled parser cannot parse lists, and its docstring already recommends the migration.
  **Corpus-verified, not generically behavior-preserving**: the `yaml` package differs on
  edge cases the old parser documents (YAML 1.1 `yes/no/on/off` coercion, trailing comments,
  quote escapes), so the regression test asserts identical parse output across the _actual
  current corpus_ (all skills, rules, personas) rather than claiming general equivalence.
  This also buys the frontmatter writer the backlog enforcement task needs.
- **Committed platform-default vocabulary**: an `as const` array in
  `@openthrottle/openthrottle-skills` (~17 seeds: github, git, terraform, infra, ci, nx,
  openthrottle, database, ui, frontend, backend, testing, docs, commit, pr-review, planning —
  finalized during the tagging pass). This is the **offline CI SSOT** for _this monorepo's
  own corpus_.
- **Two validation layers, deliberately split.** The shared `skillFrontmatterSchema` models
  `tags` **permissively** (array of kebab-case strings) — it runs at ingest for external
  workspace repos too, where a strict enum over _this_ repo's const would hard-fail repos we
  don't control, violating invariant 4. The **committed-const enum check is a separate,
  CI-only validation** (wired into `monorepo:check-agent-assets-ssot`) applied only to
  `.agents/skills/` in this monorepo. Ingest never enum-validates tags; resolve-time
  vocabulary mismatches warn (invariant 4).
- **Runtime vocabulary is DB-authoritative and per-workspace**: a `skill_tags` table seeded
  from the committed default on provisioning. Workspaces add/rename/remove tags for
  themselves; the committed default is untouched. Exposed via GraphQL/MCP for external OT
  consumers. (Chosen over const-only because the platform is meant to be user-customized;
  the committed const remains authoritative for this monorepo's own CI.)
- Complete curated tagging pass over all 46 skills (agent-drafted, human-reviewed; every
  skill reviewed, none silently skipped) — half-tagged corpora make tag-allow rules silently
  miss skills.

## Rules

Two levels, making cardinality explicit:

- **Rule set** — at most **one per project** (FK to project, unique), owned per-workspace.
  Carries the single **`posture`** (`allow | deny`, default `allow`): `allow` = today's
  behavior minus explicit denies; `deny` = nothing model-invocable except explicit allows
  (the "infra ⇒ only github/terraform" case). Posture is **not** environment-qualified in
  v1 — exactly one posture per project, so rung 3 can never conflict. No rule set ⇒
  passthrough.
- **Rules** — zero or more rows per rule set. Each rule carries:
  - **tag allow/deny lists** — validated against the workspace vocabulary at write time;
  - **slug allow/deny lists** — one-off exceptions (e.g. allow `git-commit` in an otherwise
    deny-postured project);
  - **`environment` qualifier** (nullable): `null` applies to all environments; a value
    scopes the rule to that environment;
  - reserved nullable `editor` / `role` columns, unread in v1.
- Zod `.strict()` validation with actionable errors; malformed config is rejected at write
  time, not discovered at resolve time.

## Precedence ladder

Evaluated per skill, top-down; **the first decisive rung wins**.

0. **Environment pre-filter** — select rules whose `environment` matches the context
   (`null` matches all).
1. **Slug allow/deny** for this exact slug → decisive.
2. **Tag allow/deny** for any tag the skill carries → decisive.
3. **Project posture** (a single per-project value — see Rules) — `deny` ⇒ not
   model-invocable; `allow` ⇒ fall through.
4. **Frontmatter `disable-model-invocation`** — `true` ⇒ not model-invocable;
   `false`/unset ⇒ model-invocable.

**Within-rung conflict resolution (rungs 1–2), in strict order:**

1. **Specificity filters first**: if any matching rule at this rung is
   environment-specific, environment-agnostic matches at this rung are discarded.
2. **Then polarity**: among the surviving matches, **deny wins** over allow (least
   privilege for autonomous invocation; a human can still invoke explicitly).

So for context `ralph`, a rule `{environment: ralph, tagAllow: [github]}` beats
`{environment: null, tagDeny: [github]}` — specificity discards the agnostic deny before
polarity is consulted. Two same-specificity rules with opposing polarity resolve to deny.

Consequences (intentional): no rules ⇒ rung 4 only ⇒ passthrough; an allow at rungs 1–2 can
re-enable a skill shipped as `disable-model-invocation: true`; posture is a single
per-project value, so rung 3 can never conflict.

## Topology

```
SKILL.md frontmatter (SSOT: name, description, disable-model-invocation, tags)
        │ ingest (collectAgentAssetsForIngest, extended)
        ▼
openthrottle-server DB:  ingested skills ⋅ skill_tags vocab (per-workspace) ⋅ rules (per-project)
        │ composes inputs, calls
        ▼
resolveSkillAvailability(context, skills, rules, vocab)   ← pure, in @openthrottle/openthrottle-skills
        │
        ▼
GraphQL query + MCP tool  ──►  external OT consumers (primary)
        └───────────────────►  openthrottle-developer UI (secondary; read view + authoring UI)
```

- The resolver is a **pure function** (no I/O) in `packages/openthrottle-skills`, exported
  with `@public`, unit-tested against every rung and conflict case.
- `openthrottle-server` is the **single resolution point**. The developer app does not
  resolve locally; it reads the same GraphQL surface external consumers use. Disk discovery
  (`discoverRepoSkills`) becomes an ingestion feeder, not a UI data source.
- Ingest extension: persist each skill's `tags` + static flag in server-queryable form, for
  the monorepo's own skills (dogfood) and connected workspace repos.

## Output contract

The GraphQL query (mirrored as an MCP tool) takes
`{ projectId, environment? = interactive }` (editor/role reserved). The **skill universe**
for a `projectId` is the set of skills most recently ingested for that project's linked
repository (the monorepo project covers this repo's 46 — the dogfood path). The result:

```ts
{
  skills: Array<{
    slug: string
    staticDisableModelInvocation: boolean | undefined   // tri-state preserved
    effectiveDisableModelInvocation: boolean
    provenance: string                                   // grammar below
  }>
  warnings: string[]   // e.g. 'unknown-tag:<tag>@<slug>' — invariant 4's surfacing channel,
                       // emitted at resolve time, deduped. Emitted only when the tag rung is
                       // actually evaluated (a rule set exists and the slug rung was not
                       // decisive) — pure passthrough emits zero warnings, keeping the
                       // no-config path zero-cost per invariant 3. Rule-side references to
                       // unknown tags simply never match and produce no warning.
}
```

**Provenance grammar** (closed set; unit tests assert exact strings):

| decisive rung         | provenance                                                       |
| --------------------- | ---------------------------------------------------------------- |
| frontmatter (rung 4)  | `frontmatter:true` \| `frontmatter:false` \| `frontmatter:unset` |
| posture deny (rung 3) | `posture:deny` (allow-posture falls through, never decides)      |
| slug (rung 1)         | `slug-allow:<slug>@<ruleId>` \| `slug-deny:<slug>@<ruleId>`      |
| tag (rung 2)          | `tag-allow:<tag>@<ruleId>` \| `tag-deny:<tag>@<ruleId>`          |

When several tags/rules survive conflict resolution at a rung, the named tag (and its rule)
is the **alphabetically first** among the winning-polarity matches — deterministic and
testable.

**No-config passthrough invariant**: for a project with no rule set,
`effectiveDisableModelInvocation === (staticDisableModelInvocation ?? false)` for every
skill (semantic equivalence — `unset` normalizes to invocable; a strict `===` against the
tri-state static would be false for every unset skill). This exact expression is what the
test asserts. The same shape is what the follow-on suggestion engine consumes.

## Surfacing (developer app, via GraphQL)

- **Read view**: effective value prominent in the Skills table; static value + provenance as
  secondary detail. Quick win lands first: the _static_ flag as a GraphQL field + table
  column (tri-state), independent of rules/vocab.
- **Authoring UI**: per-project rules editor (posture, tag allow/deny, slug exceptions,
  environment qualifier) and a workspace vocabulary manager, both over the GraphQL
  mutations. `@openthrottle/react-router-shadcn` components; mutations server-side.

## Backlog: enforcement

Materialize the resolved flag into synced target-repo skill copies via the yaml writer
(SSOT untouched), and reconcile with `OPENTHROTTLE_REPO_SKILL_PATHS` — a hand-maintained
25-entry list that has already drifted (dangling `my-pull-requests` entry; see the
[audit](./agent-skills-pipeline-findings.md)). The working intent is that resolver output
**subsumes** the hardcoded list; the enforcement task proves or amends that, and owns the
migration/compat story for repos synced under the old list. Omitting skills from sync is
explicitly rejected as the mechanism — it would gate human invocation too.

## Rejected alternatives (why)

- **Write-back to SSOT frontmatter** — breaks single-source-of-truth; same skill would need
  different values per context; churns git history. Resolve-at-read keeps one SSOT.
- **Free-form tags** — drifts (`gh` vs `github`); machine-matching needs a controlled set.
- **Const-only vocabulary (no DB)** — cheaper, but the platform is user-customizable and OT
  exposes its registry to external consumers; DB-authoritative + committed-default-for-CI
  keeps both properties.
- **Global posture flip to default-deny** — surprising behavior change for every
  unconfigured project; hybrid per-project posture preserves passthrough.
- **Client-side resolution in the developer app** — two resolution points that can disagree;
  the UI reads the same GraphQL surface as everyone else.
- **Tags as an availability axis without a tagging pass** — half-tagged corpora make
  tag-allow rules silently miss skills; the complete pass is a correctness requirement.
