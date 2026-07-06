# Plan 006: Retire the vestigial root `schema.gql` and the obsolete schema-sync gate

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9d10ccc6..HEAD -- schema.gql scripts/verify-graphql-schema-sync.ts applications/openthrottle-server/package.json package.json .github/workflows/continuous-integration.yml packages/graphql-codegen/src/index.ts`
> On any change, re-verify the "Current state" facts before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (if plan 007 is also being executed in this PR, run 007's schema regeneration first — see Maintenance notes)
- **Category**: dx
- **Planned at**: commit `9d10ccc6`, 2026-07-05

## Why this matters

The repo commits **two** GraphQL schema files: `schema.gql` (repo root) and `applications/openthrottle-server/schema.gql` (the app copy). A script, `verify-graphql-schema-sync`, exists to keep them identical — but it is a **no-op** (its `main()` sets `earlyReturn = true` and exits 0 without comparing anything). Worse, the whole premise is obsolete:

- The server writes the **app copy** on boot: `dev`/`start`/`build` all run with `cwd: {projectRoot}`, and `autoSchemaFile: 'schema.gql'` is cwd-relative, so it resolves to `applications/openthrottle-server/schema.gql`.
- Every codegen consumer reads the **app copy**: the shared `defineCodegen` helper hard-codes `../../applications/openthrottle-server/schema.gql`.
- **Nothing generates or reads the root `schema.gql`** except the no-op verify script itself. Its CI invocation is already commented out.

So the root file is a stale committed duplicate, and the gate guarding it is a green checkmark that verifies nothing — actively misleading (this audit and the server's own `AGENTS.md` both initially believed boot writes the root file; it does not). This plan removes the dead gate and the vestigial file, and corrects the docs that describe the wrong flow.

## Current state

- `scripts/verify-graphql-schema-sync.ts` — the no-op. Top of `main()`:
  ```ts
  const earlyReturn = true;
  if (earlyReturn) {
    console.log('✅ Deprecating this method - this check is no longer needed');
    process.exit(0);
  }
  ```
- `applications/openthrottle-server/package.json` → `nx.targets.verify-graphql-schema-sync`:
  ```json
  {
    "cache": false,
    "description": "Verify the committed root schema.gql matches the server code-first schema; fails on drift.",
    "executor": "nx:run-commands",
    "options": {
      "command": "pnpm exec tsx ./scripts/verify-graphql-schema-sync.ts",
      "cwd": "{workspaceRoot}"
    }
  }
  ```
- Root `package.json` line 429:
  ```json
  "check:local:verify": "pnpm nx run openthrottle-server:verify-graphql-schema-sync && pnpm nx run-many --target=verify-graphql-codegen --projects=@openthrottle/openthrottle-agentic-ralph,@openthrottle/openthrottle-mcp",
  ```
  (The `verify-graphql-codegen` run-many part is a REAL check and must be KEPT; only the `verify-graphql-schema-sync &&` prefix is removed.)
- `.github/workflows/continuous-integration.yml` ~lines 130–131 — an already-commented-out block:
  ```yaml
  # - name: '🔒 GraphQL schema sync (root vs server)'
  #   run: pnpm dlx nx@${{ env.NX_VERSION }} run openthrottle-server:verify-graphql-schema-sync
  ```
- `schema.gql` (repo root) — tracked, currently identical to the app copy, generated/consumed by nothing in the current tooling.
- `packages/graphql-codegen/src/index.ts` — `SCHEMA_RELATIVE_PATH = ../../applications/openthrottle-server/schema.gql` (this is the app copy; do NOT change it). Its doc comment on line ~25 says "repo-root `schema.gql`" — that comment is stale wording; the constant itself points at the app copy.
- Docs describing the (now-incorrect) two-file flow, to correct:
  - `applications/openthrottle-server/AGENTS.md` — the "Schema regeneration direction" invariant claims boot rewrites the **repo-root** `schema.gql`. Wrong: boot writes the app copy (cwd is `{projectRoot}`).
  - Root `CLAUDE.md` — "GraphQL schema + codegen flow" numbered steps reference copying between root and app.
  - `CONTRIBUTING.md` — a "Regenerate the server copy / Sync the repo-root schema" section with a `cp` step.

## Commands you will need

| Purpose                          | Command                                                                                                                        | Expected on success                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------- |
| Find all refs to root schema.gql | `grep -rn "schema.gql" . --exclude-dir=node_modules --exclude-dir=.nx --exclude-dir=.git`                                      | (inspect — see Step 3)                             |
| Confirm no code reads root path  | `grep -rn "'schema.gql'\|/schema.gql\|rootSchema" packages applications scripts --include=\*.ts                                | grep -v "openthrottle-server/schema.gql"`          | only the verify script (being deleted) |
| Regenerate codegen after schema  | `pnpm nx run-many --target=codegen-graphql --projects=@openthrottle/openthrottle-mcp,@openthrottle/openthrottle-agentic-ralph` | exit 0                                             |
| Verify codegen check still wired | `pnpm run check:local:verify`                                                                                                  | exit 0                                             |
| Nx graph still loads             | `pnpm nx show project openthrottle-server --json`                                                                              | valid JSON, no `verify-graphql-schema-sync` target |

## Scope

**In scope**:

- Delete `scripts/verify-graphql-schema-sync.ts`
- `applications/openthrottle-server/package.json` — remove the `verify-graphql-schema-sync` target
- Root `package.json` — edit `check:local:verify` to drop the `verify-graphql-schema-sync` prefix (keep the codegen-verify run-many)
- `.github/workflows/continuous-integration.yml` — remove the commented-out schema-sync block
- Delete root `schema.gql`
- `applications/openthrottle-server/AGENTS.md`, root `CLAUDE.md`, `CONTRIBUTING.md` — correct the schema-flow text to describe the single app copy

**Out of scope** (do NOT touch):

- `applications/openthrottle-server/schema.gql` — the live, canonical copy. Keep it.
- `packages/graphql-codegen/src/index.ts` `SCHEMA_RELATIVE_PATH` value — it correctly points at the app copy. (You MAY fix its stale "repo-root" comment wording, but do not change the path.)
- `autoSchemaFile` in `packages/nestjs-graphql` or the server's `forRoot` call — no code change to schema generation is needed; the server already writes the app copy.
- The `verify-graphql-codegen` targets/checks — real, keep them.

## Git workflow

- Work on the single shared PR branch the operator assigns.
- Commit style: conventional commits, no attribution. Example: `chore(openthrottle-server): retire vestigial root schema.gql and no-op sync gate`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Remove the nx target and the no-op script

- In `applications/openthrottle-server/package.json`, delete the entire `verify-graphql-schema-sync` entry from `nx.targets` (keep the JSON valid).
- Delete `scripts/verify-graphql-schema-sync.ts`.

**Verify**: `pnpm nx show project openthrottle-server --json` → valid JSON that does NOT contain `verify-graphql-schema-sync`.

### Step 2: Rewire the root script and remove the commented CI block

- In root `package.json`, change `check:local:verify` to drop the removed target, keeping the codegen verify:
  ```json
  "check:local:verify": "pnpm nx run-many --target=verify-graphql-codegen --projects=@openthrottle/openthrottle-agentic-ralph,@openthrottle/openthrottle-mcp",
  ```
- In `.github/workflows/continuous-integration.yml`, delete the two commented lines (`# - name: '🔒 GraphQL schema sync...'` and its `# run:`).

**Verify**:

- `grep -rn "verify-graphql-schema-sync" . --exclude-dir=node_modules --exclude-dir=.nx --exclude-dir=.git` → no output.
- `pnpm run check:local:verify` → exit 0 (the codegen verify still runs).

### Step 3: Confirm nothing else references the root schema.gql, then delete it

Run: `grep -rn "schema.gql" . --exclude-dir=node_modules --exclude-dir=.nx --exclude-dir=.git`

Every remaining hit must be one of: (a) the **app copy** path `applications/openthrottle-server/schema.gql`, (b) documentation you will update in Step 4, (c) `seed.sql` (a DB dump containing historical doc text — ignore), or (d) `packages/graphql-codegen/src/index.ts` (points at the app copy). If ANY hit is code that reads/writes the **root** `./schema.gql` as a build input/output or codegen source, STOP (see STOP conditions).

If clean, delete the root file: `git rm schema.gql`.

**Verify**: `test -f schema.gql && echo EXISTS || echo GONE` → `GONE`. `test -f applications/openthrottle-server/schema.gql && echo OK` → `OK` (app copy still present).

### Step 4: Correct the schema-flow docs

Update the three docs to describe the single canonical app copy (no root file, no cp step, no sync gate):

- `applications/openthrottle-server/AGENTS.md` — rewrite the "Schema regeneration direction" bullet: booting the server (`dev`/`start`, `cwd: {projectRoot}`) regenerates `applications/openthrottle-server/schema.gql`; codegen consumers read that file via `@openthrottle/graphql-codegen`'s `defineCodegen`. Remove the claim about the repo-root file and the `cp` step and the reference to `verify-graphql-schema-sync`.
- Root `CLAUDE.md` — in "GraphQL schema + codegen flow", drop the `cp … schema.gql` step; the flow is: boot server to regenerate the app copy → run affected codegen → commit the app `schema.gql` + `__generated__`.
- `CONTRIBUTING.md` — remove the "Sync the repo-root schema" / `cp applications/openthrottle-server/schema.gql schema.gql` step and any "commit both schema files" wording; there is one schema file now.

**Verify**: `grep -rn "cp .*schema.gql\|repo-root schema\|root schema.gql" applications/openthrottle-server/AGENTS.md CLAUDE.md CONTRIBUTING.md` → no output (all stale references removed).

### Step 5: Full verification

**Verify**:

- `pnpm nx run openthrottle-server:build` → exit 0
- `pnpm nx run-many --target=codegen-graphql --projects=@openthrottle/openthrottle-mcp,@openthrottle/openthrottle-agentic-ralph` → exit 0 (consumers still resolve the schema from the app copy)
- `pnpm run check:local:verify` → exit 0
- `git status` → deletions of `schema.gql` and the script; edits to the package.jsons, CI yaml, and three docs; NOTHING under `applications/openthrottle-server/schema.gql`.

## Test plan

No unit tests. The regression guards are: (1) codegen for the two verify-graphql-codegen consumers still succeeds reading the app copy, (2) the server build succeeds, (3) `check:local:verify` still runs its real (codegen) half. If a `nestjs-graphql.module.test.ts` asserts `autoSchemaFile === 'schema.gql'`, it is unaffected (we don't change that value).

## Done criteria

ALL must hold:

- [ ] `scripts/verify-graphql-schema-sync.ts` deleted; `verify-graphql-schema-sync` target gone from `nx show project openthrottle-server --json`
- [ ] `grep -rn "verify-graphql-schema-sync" .` (excluding node_modules/.nx/.git) → no output
- [ ] Root `schema.gql` deleted; `applications/openthrottle-server/schema.gql` intact
- [ ] `check:local:verify` still runs the `verify-graphql-codegen` run-many and exits 0
- [ ] `pnpm nx run openthrottle-server:build` exits 0
- [ ] Stale schema-flow references removed from `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- Step 3's grep shows any **code** (not doc/seed) that reads or writes the root `./schema.gql` — e.g. a codegen config, an nx target `inputs`/`outputs` entry, or a Docker/CI step. That would mean the root file is not vestigial; report the reference.
- The server `build` or the consumer `codegen-graphql` fails after deleting the root file.
- `defineCodegen`'s `SCHEMA_RELATIVE_PATH` does NOT point at `applications/openthrottle-server/schema.gql` (drift) — the "consumers read the app copy" premise is broken; report it.

## Maintenance notes

- **Ordering with plan 007**: if plan 007 (pagination args) is in the same PR, run 007's schema-regeneration step FIRST, then this plan — so the final committed app `schema.gql` includes 007's new args and there is only one schema file to reconcile.
- Reviewer: confirm only the ROOT `schema.gql` was deleted and the app copy is untouched; confirm the codegen consumers still build.
- Follow-up (deferred, separate — a Direction item): with the no-op gate gone, there is no automated schema-drift protection at all. Consider a real check — a codegen `--check` dry-run in CI, or asserting the committed app `schema.gql` matches a fresh boot — so consumer apps can't silently break. That is a design task, not this cleanup.
