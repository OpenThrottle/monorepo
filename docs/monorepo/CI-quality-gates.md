# CI quality gates — priority and owners

This table is the published outcome of the **Repository health, DX, and correctness audit** (OpenThrottle plan: CI gates investigation) and the **Re-enable CI quality gates** execution plan. It defines how GitHub Actions gates are prioritized, who owns each area, and how they map to `.github/workflows/continuous-integration.yml`.

**Workflow file:** [`.github/workflows/continuous-integration.yml`](../../.github/workflows/continuous-integration.yml)

## Priority levels

| Priority | Intent                                                        | Blocks PR merge?                                  |
| -------- | ------------------------------------------------------------- | ------------------------------------------------- |
| **P0**   | Contract and type safety on every affected change             | **Yes** — must pass                               |
| **P1**   | Structural integrity (graph, package-specific codegen guards) | **Yes** — must pass                               |
| **P2**   | Automated tests for **all affected** projects                 | **Yes** when affected projects are in scope       |
| **P3**   | Hygiene / debt ceilings (report-only, no `knip --fix` in CI)  | **Yes** — fails when issue count exceeds baseline |
| **P4**   | Informational, cost-deferred, or not yet rolled out           | **No** (disabled or local-only)                   |

Lower P numbers run first in the `build` job where steps are ordered; separate jobs (`knip-report`, `nx-circular-dependencies`) run in parallel with `build` on pull requests.

## `typecheck` versus `test`

The P0 gate **`typecheck`** is **not** a test runner. It runs `tsc` over each project's **source and test files** — a `tsc --build … --emitDeclarationOnly` pass followed by `tsc --noEmit -p tsconfig.test.json` when the project has a test config — and only verifies that everything type-checks. It **does not** load Vitest or execute `describe` / `it` bodies. (This single target replaced the former `typecheck` + `typecheck-tests` split.)

The P2 gate **`test`** runs Vitest and **does** execute test bodies. A PR can pass P0 `typecheck` while still failing P2 (or local `pnpm nx run <project>:test`) if assertions or runtime mocks are wrong.

See [CONTRIBUTING.md](../../CONTRIBUTING.md#testing-typecheck-versus-test) for contributor-oriented commands and [MONOREPO.md](../../MONOREPO.md#typecheck-versus-test).

## Gate table (P0–P4)

| Priority | Gate                                          | CI job / step                            | Command / target                                                                                                                 | Owner                                     | Merge blocker    | Status                                                                                             |
| -------- | --------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------- |
| **P0**   | Affected GraphQL + React Router codegen drift | `build` → Codegen Tasks                  | `nx affected --target=codegen-graphql,codegen-react-router` then `git diff --exit-code`                                          | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                                             |
| **P0**   | Lint, typecheck (source + tests, affected)    | `build`                                  | `nx affected --target=lint,typecheck`                                                                                            | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                                             |
| **P1**   | Nx project graph circular dependencies        | `nx-circular-dependencies`               | `pnpm exec tsx ./scripts/nx-circular-dependencies.ts`                                                                            | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                                             |
| **P1**   | Root `schema.gql` matches server schema       | `build`                                  | `nx run openthrottle-server:verify-graphql-schema-sync`                                                                          | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                                             |
| **P1**   | Agentic Ralph GraphQL codegen drift           | `build` → GraphQL codegen drift guard    | `nx run-many --target=verify-graphql-codegen --projects=@openthrottle/openthrottle-agentic-ralph,@openthrottle/openthrottle-mcp` | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                                             |
| **P1**   | MCP developer GraphQL codegen drift           | `build` → GraphQL codegen drift guard    | (same step as Agentic Ralph row)                                                                                                 | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                                             |
| **P2**   | Vitest (all affected projects)                | `build` → `NX <target> affected` step    | `nx affected --target=lint,typecheck,test` (the matrix `target`; no exclude)                                                     | [visormatt](https://github.com/visormatt) | Yes (affected)   | **On** (full affected)                                                                             |
| **P3**   | Knip dead-code baseline                       | `knip-report`                            | `nx run monorepo:knip-ci` — see [Knip.md](./Knip.md)                                                                             | [visormatt](https://github.com/visormatt) | Yes (regression) | **On**                                                                                             |
| **P4**   | Parallelized full monorepo `test` (sharded)   | — (commented `parallelize-tasks` matrix) | `scripts/parallelize-tasks.ts` + `nx affected --target=test`                                                                     | [visormatt](https://github.com/visormatt) | —                | **Off** — sharding optimization, tracked via OT plan _Improve test coverage and CI test execution_ |
| **P4**   | Knip report without baseline (local / ad hoc) | —                                        | `nx run monorepo:knip`                                                                                                           | [visormatt](https://github.com/visormatt) | No               | Local / optional                                                                                   |
| **P4**   | Nx dependency graph HTML artifact             | `nx-dependency-graph`                    | `scripts/nx-dependency-graph.ts`                                                                                                 | [visormatt](https://github.com/visormatt) | No               | **Off** (`if: false`) — see [nx-graph.md](./nx-graph.md)                                           |
| **P4**   | `nx release` publish                          | `nx-release` workflow                    | `nx release`                                                                                                                     | [visormatt](https://github.com/visormatt) | No               | **Off** (workflow disabled)                                                                        |

**Owner** is the GitHub username accountable for keeping the gate green, tuning scope, and owning follow-up OT plans. Infra gates (P0–P1, workflow wiring) and phased test rollout are currently owned by **visormatt**; expand owners when another maintainer takes a gate (update this table in the same PR).

## Test gate (P2)

The P2 gate runs Vitest (`test`) for **all affected projects** — there is no per-project allowlist or exclude. CI runs the matrix target `lint,typecheck,test` in a single `nx affected` invocation (see `.github/workflows/continuous-integration.yml`, step `NX <target> affected`). The earlier "phased gate" step that excluded everything except `openthrottle-server`, `@openthrottle/openthrottle-mcp`, and `@tools/workflows` is commented out in the workflow.

To mirror this locally, `pnpm run check:local:affected-test` runs `nx affected --target=test --parallel --nxBail` (no exclude), so a green `check:local` exercises the same affected test set CI does. The P4 row below tracks an optional sharding optimization (`parallelize-tasks.ts`), not a narrower scope.

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
