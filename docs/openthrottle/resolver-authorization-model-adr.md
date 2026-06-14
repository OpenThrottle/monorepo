# ADR: GraphQL resolver authorization model

**Status:** Accepted (Path A — document local-dev single-principal as by-design)
**Date:** 2026-06-14
**Plan:** `7c95a26c-31c7-48ac-bc2a-833581496153` (Decide and enforce a consistent resolver authorization model)
**Companion planning plan:** `ff184aa8-af3f-48c9-a1ae-56a825bf3f51` (expands Paths A/B/C for future escalation)
**Related:** [openthrottle-server-auth.md](./openthrottle-server-auth.md)

## Problem

Permission coverage across the `openthrottle-server` GraphQL resolvers is inconsistent. A `/improve`
audit (2026-06-12) flagged that `plans`, `projects`, and `tasks` resolvers — including destructive
mutations like `deletePlan`, `deleteProject`, and `deleteTask` — carry no permission check, while
other domains do. We need a single, documented stance so the inconsistency is a deliberate choice
rather than an accident, and a gate that keeps it from drifting.

## Context — authorization inventory

A global `GlobalAuthGuard` (`APP_GUARD` in `app.module.ts`) requires a valid principal on every
operation; `@Public()` opts out (used by `auth` login/signout/register, `health`, and `payments`
checkout). Beyond that global authentication, coverage splits three ways across the 28 resolvers
under `applications/openthrottle-server/src/graphql/`:

- **Permission-guarded** (`@UseGuards(GqlPermissionsGuard)` + `@Permissions(...)`): `agent-conversations`,
  `code-search`, `model-discovery`, `roles`, `service-accounts`, `users`, `workspace-settings`.
- **Public** (intentionally unauthenticated): `auth`, `health`, `payments`.
- **Authenticated-only, no permission/ownership check:** `plans` (incl. `deletePlan`), `projects`
  (incl. `deleteProject`), `tasks` (incl. `deleteTask`, `reorderPlanTasks`), `queues`, `notes`,
  `prompts`, `commit-links`, `plan-output-stream`, `agentic-workflow`, `agents`, `development`, and
  the read-only `activity`/`daily-stats`/`generators`/`metrics`/`search`/`*-embeddings` resolvers.

Two constraints shape the decision:

1. **No ownership column.** `Project`, `Plan`, and `Task` have no `workspace_id`/`user_id`/owner FK,
   so object-level ("you may only touch rows you own") checks are **not currently expressible**
   without a schema migration.
2. **Service accounts are first-class callers.** The Ralph worker and `openthrottle-mcp` run as
   service-account principals and call the `plans`/`tasks` mutations heavily. Any permission gate
   that does not also grant those accounts matching roles would **silently break Ralph runs** — the
   highest-risk failure mode.

## Options evaluated

### Path A — Document local-dev single-principal as by-design (CHOSEN)

Treat the unguarded resolvers as intentional for the current deployment (localhost binding, a single
trusted operator, trusted service accounts). Record the assumptions and revisit triggers, and add a
drift gate so every resolver declares a stance (guard **or** an explicit exemption marker). No
behavioral change. Zero risk to Ralph/MCP; matches reality and the no-owner-column constraint.

### Path B — Permission-guard everything (role-based)

Add `GqlPermissionsGuard` + a `@Permissions(...)` taxonomy to every unguarded resolver and grant the
Ralph/MCP service accounts matching roles. Defense-in-depth, but **role-based only** (no object-level
ownership without Path C), medium-large effort, and real risk of breaking Ralph if a role is missed.

### Path C — Path B + object-ownership model

Path B plus a `workspace_id`/owner-FK schema migration enabling object-level checks. The only option
that makes a hosted multi-user deployment safe; also the largest (its own epic).

Paths B and C are expanded into concrete scoping tasks in planning plan
`ff184aa8-af3f-48c9-a1ae-56a825bf3f51`.

## Decision

Adopt **Path A**. For the current single-operator, localhost deployment, the unguarded
`plans`/`projects`/`tasks` (and peer) resolvers are **intentionally** protected only by global
authentication. We explicitly accept that any authenticated principal can call destructive mutations,
because the only principals that exist locally are the operator and the operator's own trusted
service accounts (Ralph, MCP).

To keep this honest and reviewable:

- This ADR records the stance and its assumptions.
- A **drift gate** (plan `7c95a26c`, task `fdc660b4`) requires every resolver to declare its
  authorization stance — a guard, `@Public()`, or an explicit exemption marker — so a newly-added
  unguarded resolver is a reviewed decision, not an oversight.

## Consequences

- **Positive:** no risk to Ralph/MCP; no new permission matrix to maintain; the security posture is
  explicit and enforced against drift; matches the no-owner-column reality.
- **Negative / accepted risk:** destructive mutations remain reachable by any authenticated
  principal. This is **unsafe the moment the server is exposed beyond localhost or to untrusted
  principals** — see triggers below.

## Revisit triggers

Escalate to Path B (then C) when **any** of these become true:

- The server is bound to a non-localhost interface or otherwise network-exposed.
- More than one **trusted** principal needs least-privilege separation (e.g. a read-only MCP token).
- Any **untrusted**, multi-user, or multi-tenant / hosted deployment is planned.

When a trigger fires, pick up planning plan `ff184aa8-af3f-48c9-a1ae-56a825bf3f51`, which already
scopes the RBAC rollout (Path B) and the ownership-model migration (Path C), plus the A→B→C
escalation criteria.
