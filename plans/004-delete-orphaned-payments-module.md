# Plan 004: Delete the orphaned (commented-out) payments module

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9d10ccc6..HEAD -- applications/openthrottle-server/src/graphql/payments applications/openthrottle-server/src/modules/payments applications/openthrottle-server/src/app.module.ts`
> If any of these changed since this plan was written — especially if the
> `app.module.ts` payments imports were UNcommented (payments went live) —
> STOP; the delete decision no longer applies.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `9d10ccc6`, 2026-07-05

## Why this matters

A full payments feature (resolver, service module, GraphQL object/input types, and a test) sits in the tree but is **not wired in** — its two imports in `app.module.ts` are commented out, so none of its resolver fields reach the GraphQL schema and none of its code runs. There is no roadmap doc referencing it. Orphaned, unreachable code is a maintenance tax: it shows up in searches, greps, and audits as if it were live (this audit initially flagged a "payments authorization gap" that turned out to be dead code), and it drifts out of sync with the rest of the app. The decision (confirmed by the maintainer) is to delete it; git history preserves it if Stripe checkout is revived.

## Current state

- `app.module.ts` lines 84–85 — the ONLY references to the payments modules, both commented out:
  ```ts
  // import { PaymentsGraphqlModule } from './graphql/payments/payments-graphql.module';
  // import { PaymentsModule } from './modules/payments/payments.module';
  ```
  These are not in the `buildImports` list, so payments is not registered anywhere.
- The orphaned files (6 total):
  - `src/graphql/payments/payments-graphql.module.ts`
  - `src/graphql/payments/payments.input.ts`
  - `src/graphql/payments/payments.object.ts`
  - `src/graphql/payments/payments.resolver.ts`
  - `src/graphql/payments/payments.resolver.test.ts`
  - `src/modules/payments/payments.module.ts`
- No other server source references payments — confirmed: `grep -rln "ayments\|PaymentsModule\|payments.resolver\|createCheckoutSession"` across `src` matches only the 6 files above.

Note on the Stripe _package_: `@openthrottle/nestjs-stripe` (webhook handling) is a SEPARATE, live workspace package and is OUT OF SCOPE — do not touch it. This plan removes only the server-app payments _checkout_ feature files listed above.

## Commands you will need

| Purpose                                     | Command                                                                                                         | Expected on success                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Confirm only these files reference payments | `grep -rln "PaymentsModule\|PaymentsGraphqlModule\|createCheckoutSession" applications/openthrottle-server/src` | only the 6 listed files (before deletion) |
| Typecheck                                   | `pnpm nx run openthrottle-server:typecheck`                                                                     | exit 0                                    |
| Test                                        | `pnpm nx run openthrottle-server:test`                                                                          | all pass                                  |
| Build                                       | `pnpm nx run openthrottle-server:build`                                                                         | exit 0                                    |
| Schema unchanged                            | `git status --porcelain applications/openthrottle-server/schema.gql schema.gql`                                 | no output (schema not modified)           |

## Scope

**In scope**:

- Delete the 6 files listed above.
- `applications/openthrottle-server/src/app.module.ts` — remove the two commented-out payments import lines (84–85).

**Out of scope** (do NOT touch):

- `packages/nestjs-stripe/**` — the live Stripe webhook package. Unrelated to this feature.
- `schema.gql` / `applications/openthrottle-server/schema.gql` — must NOT change (payments was never in the schema because it was never registered). If deleting changes the schema, STOP.
- Any `.env` / config keys — leaving unused Stripe config keys is harmless and out of scope.

## Git workflow

- Work on the single shared PR branch the operator assigns.
- Commit style: conventional commits, no attribution. Example: `chore(openthrottle-server): delete orphaned unused payments checkout module`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Confirm the module is truly orphaned

**Verify**:

- `grep -rln "PaymentsModule\|PaymentsGraphqlModule\|createCheckoutSession" applications/openthrottle-server/src` → matches ONLY the 6 files in "Current state".
- In `app.module.ts`, the only payments references are the two commented lines (84–85). Confirm: `grep -n "ayment" applications/openthrottle-server/src/app.module.ts` shows only commented lines.

If payments appears in `buildImports` (uncommented) or in any file outside the 6, STOP.

### Step 2: Delete the payments files

Delete these directories/files:

- `applications/openthrottle-server/src/graphql/payments/` (all 5 files in it)
- `applications/openthrottle-server/src/modules/payments/` (the 1 file in it)

**Verify**: `ls applications/openthrottle-server/src/graphql/payments applications/openthrottle-server/src/modules/payments 2>/dev/null` → both report "No such file or directory".

### Step 3: Remove the commented imports from app.module.ts

Delete lines 84–85 (the two `// import { Payments... }` lines).

**Verify**: `grep -n "ayment" applications/openthrottle-server/src/app.module.ts` → no output.

### Step 4: Typecheck, build, test, schema check

**Verify**:

- `pnpm nx run openthrottle-server:typecheck` → exit 0
- `pnpm nx run openthrottle-server:build` → exit 0
- `pnpm nx run openthrottle-server:test` → all pass
- `git status --porcelain applications/openthrottle-server/schema.gql schema.gql` → no output (schema unchanged)

## Test plan

No new tests. Deleting `payments.resolver.test.ts` removes its (dead) tests. The remaining suite passing, plus a clean build and unchanged schema, is the guard.

## Done criteria

ALL must hold:

- [ ] The 6 payments files no longer exist
- [ ] `grep -rn "ayment" applications/openthrottle-server/src` → no output (no dangling references)
- [ ] `pnpm nx run openthrottle-server:typecheck` exits 0
- [ ] `pnpm nx run openthrottle-server:build` exits 0
- [ ] `pnpm nx run openthrottle-server:test` exits 0
- [ ] `schema.gql` and `applications/openthrottle-server/schema.gql` are unchanged
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- The `app.module.ts` payments imports are uncommented / payments is registered in `buildImports` — the feature went live since this plan was written; do NOT delete.
- Any file outside the 6 listed references payments (a shared type, a schema object re-export, an env-driven feature flag).
- Deleting changes the committed schema (`schema.gql` diff is non-empty) — that would mean payments _was_ reaching the schema; investigate before proceeding.

## Maintenance notes

- Reviewer: confirm `@openthrottle/nestjs-stripe` (webhooks) was NOT touched — only the server-app checkout feature was removed.
- If Stripe checkout is revived, scaffold it fresh (ideally via a generator) and wire it into `buildImports` with a design doc, rather than resurrecting these files.
