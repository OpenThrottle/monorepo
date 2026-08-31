# CI quality gates — priority and owners

How GitHub Actions gates are prioritized, who owns each area, and how they map to `.github/workflows/continuous-integration.yml`.

**Workflow file:** [`.github/workflows/continuous-integration.yml`](../../.github/workflows/continuous-integration.yml)

## Priority levels

| Priority | Intent                                                        | Blocks PR merge?                                  |
| -------- | ------------------------------------------------------------- | ------------------------------------------------- |
| **P0**   | Contract and type safety on every affected change             | **Yes** — must pass                               |
| **P1**   | Structural integrity (graph, package-specific codegen guards) | **Yes** — must pass                               |
| **P2**   | Automated tests for **all affected** projects                 | **Yes** when affected projects are in scope       |
| **P3**   | Hygiene / debt ceilings (report-only, no `knip --fix` in CI)  | **Yes** — fails when issue count exceeds baseline |
| **P4**   | Informational, cost-deferred, or not yet rolled out           | **No** (disabled or local-only)                   |

Lower P numbers run first in the `build` job, where steps are ordered. Today **all enforced gates run as sequential steps inside the single `build` job** — there are no separate `knip-report` / `nx-circular-dependencies` jobs (circular-dependency checking is a `build` step; Knip is not currently wired into CI — see the P3 row). The only other job in the workflow is `nx-dependency-graph`, which is `workflow_dispatch`-only.

## `typecheck` versus `test`

The P0 gate **`typecheck`** is **not** a test runner. It runs `tsc` over each project's **source and test files** — a `tsc --build … --emitDeclarationOnly` pass followed by `tsc --noEmit -p tsconfig.test.json` when the project has a test config — and only verifies that everything type-checks. It **does not** load Vitest or execute `describe` / `it` bodies. (This single target replaced the former `typecheck` + `typecheck-tests` split.)

The P2 gate **`test`** runs Vitest and **does** execute test bodies. A PR can pass P0 `typecheck` while still failing P2 (or local `pnpm nx run <project>:test`) if assertions or runtime mocks are wrong.

See [CONTRIBUTING.md](../../CONTRIBUTING.md#testing-typecheck-versus-test) for contributor-oriented commands and [MONOREPO.md](../../MONOREPO.md#typecheck-versus-test).

## Gate table (P0–P4)

> **Note on the "merge queue" trigger:** the merge queue on `main` is currently **disabled**
> (see [ci-cost.md § Merge queue on `main`](./ci-cost.md#merge-queue-on-main)), so the
> `merge_group` event never fires and the "merge queue" entries in the **Runs on** column are
> inert. They are kept — along with the workflow's `merge_group:` trigger — so the rows stay
> accurate if the queue is re-enabled.

| Priority | Gate                                          | CI job / step                                                                   | Runs on                                                                   | Command / target                                                                                                                 | Owner                                     | Merge blocker   | Status                                                                                                                    |
| -------- | --------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **P0**   | Affected GraphQL + React Router codegen drift | `build` → Codegen Tasks                                                         | Ready PR, merge queue, `push: main`                                       | `nx affected --target=codegen-graphql,codegen-react-router` then `git diff --exit-code`                                          | [visormatt](https://github.com/visormatt) | Yes             | **On**                                                                                                                    |
| **P0**   | Lint, typecheck, bundle-hooks (affected)      | `build` → NX `<target>` affected                                                | Ready PR, merge queue, `push: main`                                       | `nx affected --target=lint,typecheck,bundle-hooks-check,check-client-boundary`                                                   | [visormatt](https://github.com/visormatt) | Yes             | **On**                                                                                                                    |
| **P0**   | Client/Node boundary (React Router apps)      | `build` → NX `<target>` affected                                                | Ready PR, merge queue, `push: main`                                       | `nx affected --target=check-client-boundary` (per-app, `dependsOn: build`)                                                       | [visormatt](https://github.com/visormatt) | Yes             | **On** — OT plan `a69a8b4c`; the only CI gate that runs an app build                                                      |
| **P1**   | Nx project graph circular dependencies        | `build` → Check for circular dependencies (step; skipped for `dependabot[bot]`) | Ready PR when graph inputs change; always on merge queue and `push: main` | `pnpm exec tsx ./scripts/nx-circular-dependencies.ts`                                                                            | [visormatt](https://github.com/visormatt) | Yes             | **On**                                                                                                                    |
| **P1**   | Root `schema.gql` matches server schema       | `build` → Codegen Tasks (`git diff --exit-code`)                                | Ready PR, merge queue, `push: main`                                       | (drift caught by the P0 codegen step; no dedicated `verify-graphql-schema-sync` step runs in CI)                                 | [visormatt](https://github.com/visormatt) | Yes             | **On** (via codegen drift guard)                                                                                          |
| **P1**   | Agentic Ralph + MCP GraphQL codegen drift     | `build` → GraphQL codegen drift guard                                           | Ready PR, merge queue, `push: main`                                       | `nx run-many --target=verify-graphql-codegen --projects=@openthrottle/openthrottle-agentic-ralph,@openthrottle/openthrottle-mcp` | [visormatt](https://github.com/visormatt) | Yes             | **On**                                                                                                                    |
| **P1**   | Agent assets SSOT + frontmatter               | `build` → Agent assets SSOT / frontmatter                                       | Ready PR, merge queue, `push: main`                                       | `nx run monorepo:check-agent-assets-ssot`; `nx run monorepo:validate-agent-assets-frontmatter`                                   | [visormatt](https://github.com/visormatt) | Yes             | **On**                                                                                                                    |
| **P1**   | Dependency-license + THIRD-PARTY-LICENSES     | `build` → license gates                                                         | Ready PR when deps inputs change; always on merge queue and `push: main`  | `nx run monorepo:validate-licenses`; `pnpm run validate:notices`                                                                 | [visormatt](https://github.com/visormatt) | Yes             | **On**                                                                                                                    |
| **P1**   | Prettier format-check                         | `build` → Prettier format-check                                                 | Changed files on ready PR; full tree on merge queue and `push: main`      | `nx run monorepo:format-check`                                                                                                   | [visormatt](https://github.com/visormatt) | Yes             | **On**                                                                                                                    |
| **P1**   | Component primitive-shape audit (R4–R7)       | `build` → Component primitive-shape audit                                       | Ready PR, merge queue, `push: main`                                       | `pnpm run audit:component-shape:strict`                                                                                          | [visormatt](https://github.com/visormatt) | Yes             | **On**                                                                                                                    |
| **P2**   | Docs index reachability                       | `build` → Template compliance audit (via `audit:strict`)                        | Ready PR, merge queue, `push: main`                                       | `pnpm run audit:docs-index:strict`                                                                                               | [visormatt](https://github.com/visormatt) | Yes             | **On** — hard failure; see below                                                                                          |
| **P2**   | Vitest (all affected projects)                | `build` → NX `<target>` affected step (per shard)                               | Ready PR, merge queue, `push: main`                                       | `nx affected --exclude="*,$selector" --target=test`                                                                              | [visormatt](https://github.com/visormatt) | Yes (affected)  | **On** (full affected, split across 3 shards)                                                                             |
| **P3**   | Knip dead-code baseline                       | — (not wired into CI)                                                           | Not on PRs or merge queue                                                 | `nx run monorepo:knip-ci` — see [Knip.md](./Knip.md)                                                                             | [visormatt](https://github.com/visormatt) | No (local only) | **Off in CI** — runs via `check:local` / on-demand; no `knip-report` job exists in the workflow                           |
| **P0**   | Sharded affected `lint`/`typecheck`/`test`    | `build` → 3-leg matrix (`jobIndex: [1, 2, 3]`, `fail-fast: false`)              | Ready PR, merge queue, `push: main`                                       | `scripts/parallelize-tasks.ts` → `nx affected --exclude="*,$selector"`                                                           | [visormatt](https://github.com/visormatt) | Yes (affected)  | **On** — OT plan `b19377d1`; sizing rationale in [ci-cost.md](./ci-cost.md) § CI sharding                                 |
| **P4**   | Knip report without baseline (local / ad hoc) | —                                                                               | Not on PRs or merge queue                                                 | `nx run monorepo:knip`                                                                                                           | [visormatt](https://github.com/visormatt) | No              | Local / optional                                                                                                          |
| **P4**   | Nx dependency graph HTML artifact             | `nx-dependency-graph`                                                           | `workflow_dispatch` only                                                  | `scripts/nx-dependency-graph.ts`                                                                                                 | [visormatt](https://github.com/visormatt) | No              | **Manual** — `workflow_dispatch`-gated (`if: github.event_name == 'workflow_dispatch'`); see [nx-graph.md](./nx-graph.md) |
| **P4**   | `nx release` publish                          | `nx-release` workflow                                                           | Not on PRs or merge queue                                                 | `nx release`                                                                                                                     | [visormatt](https://github.com/visormatt) | No              | **Off** (workflow disabled)                                                                                               |

**Owner** is the GitHub username accountable for keeping the gate green, tuning scope, and owning follow-up OT plans. Infra gates (P0–P1, workflow wiring) and phased test rollout are currently owned by **visormatt**; expand owners when another maintainer takes a gate (update this table in the same PR).

## Test gate (P2)

The P2 gate runs Vitest (`test`) for **all affected projects** — there is no per-project allowlist. Since OT plan `b19377d1` the affected set is **partitioned across 3 shards**, so each box carries roughly a third of it via `--exclude="*,$selector"`; the union across shards is still the full affected set, and `parallelize-tasks.ts` fails the run if its selector does not resolve back to exactly the projects it was assigned. Within a shard, CI runs `lint,typecheck,bundle-hooks-check,check-client-boundary` at full parallelism first, then `test` at **Nx's default concurrency** — the step carries no `--parallel` flag, so 3 — keeping the heavy jsdom suites from all co-running and OOM-ing the box (see the inline comment in `.github/workflows/continuous-integration.yml`).

⚠️ This document, and others, previously described that step as **serialized (`--parallel=1`)**. It never was: the live command has no `--parallel` flag. Sharding does not settle the question either — it changes which projects share a box, not what happens when two heavy suites land on the same one. Widening or tightening it needs CI evidence, tracked separately.

The earlier "phased gate" step that excluded everything except `openthrottle-server`, `@openthrottle/openthrottle-mcp`, and `@tools/workflows` is commented out in the workflow.

To mirror this locally, `pnpm run check:local:affected-test` runs `nx affected --target=test --parallel --nxBail` (no exclude), so a green `check:local` exercises the same affected test set CI does — unsharded, since one machine has no boxes to split across.

## Docs index gate

`pnpm run audit:docs-index:strict` fails when a `docs/**/*.md` file is unreachable
from any index. Reachable means linked from `docs/README.md`, from the README of
its own directory, or from a doc that is itself linked from one of those — one
hop, so a section hub like [tools/templates/AGENT_USAGE.md](../tools/templates/AGENT_USAGE.md)
indexes the docs beside it, but a chain of prose does not. READMEs are seeds, not
subjects.

The `audit:strict` aggregate picks it up by glob, so it runs in the `build` job's
audit step and is a **hard failure** on ready PRs, the merge queue, and
`push: main`. Two ways to clear one:

- **Link it** — add a bullet with a one-line purpose to `docs/README.md` or the
  nearest directory README. This is the default; an unfindable doc is a doc
  nobody reads.
- **Allowlist it** — add the path to `ALLOWLIST` in
  `scripts/audit-docs-index.rules.ts` with an inline comment giving the reason.
  An entry without a reason is a convention failure, not a valid entry.

Run `pnpm run audit:docs-index` (warn-mode, always exits 0) to see the orphan
list while working, or `--json` for the full report.

## Related OpenThrottle plans (audit unwind)

| Theme                            | OT plan (category)                                           | Owner     |
| -------------------------------- | ------------------------------------------------------------ | --------- |
| Re-enable gates in CI            | Re-enable CI quality gates (infra)                           | visormatt |
| Contributor parity with CI       | Contributor local checks and workflow gate alignment (infra) | visormatt |
| Broader test rollout             | Improve test coverage and CI test execution (maintenance)    | visormatt |
| Knip cleanup (lowering baseline) | Knip hygiene and safe dead-code cleanup (maintenance)        | visormatt |
| GraphQL/codegen policy           | GraphQL schema and codegen drift guards (infra)              | visormatt |

## Local commands (mirror CI)

Run from the repo root after `pnpm install` and with Nx SHAs set when comparing to `main`:

```bash
# P0 — codegen + static analysis (simplified)
pnpm dlx nx affected --target=codegen-graphql,codegen-react-router --parallel
git diff --exit-code
pnpm dlx nx affected --target=lint,typecheck --parallel

# P1 — circular deps
pnpm exec tsx ./scripts/nx-circular-dependencies.ts
pnpm nx run openthrottle-server:verify-graphql-schema-sync
pnpm nx run-many --target=verify-graphql-codegen --projects=@openthrottle/openthrottle-agentic-ralph,@openthrottle/openthrottle-mcp

# P2 — tests (all affected projects, mirrors CI; same as `pnpm run check:local:affected-test`)
pnpm dlx nx affected --target=test --parallel --nxBail

# P3 — Knip baseline
pnpm nx run monorepo:knip-ci
```

For report-only Knip without the baseline gate, use `pnpm nx run monorepo:knip` ([Knip.md](./Knip.md)).

## See also

- [NX.md](./NX.md) — Nx CI patterns and caching
- [Knip.md](./Knip.md) — report vs fix, CI baseline
- [nx-graph.md](./nx-graph.md) — dependency graph and cycles
