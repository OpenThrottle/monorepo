# CI quality gates — priority and owners

This table is the published outcome of the **Repository health, DX, and correctness audit** (OpenThrottle plan: CI gates investigation) and the **Re-enable CI quality gates** execution plan. It defines how GitHub Actions gates are prioritized, who owns each area, and how they map to `.github/workflows/continuous-integration.yml`.

**Workflow file:** [`.github/workflows/continuous-integration.yml`](../../.github/workflows/continuous-integration.yml)

## Priority levels

| Priority | Intent                                                        | Blocks PR merge?                                  |
| -------- | ------------------------------------------------------------- | ------------------------------------------------- |
| **P0**   | Contract and type safety on every affected change             | **Yes** — must pass                               |
| **P1**   | Structural integrity (graph, package-specific codegen guards) | **Yes** — must pass                               |
| **P2**   | Automated tests with **phased** project scope                 | **Yes** when affected projects are in scope       |
| **P3**   | Hygiene / debt ceilings (report-only, no `knip --fix` in CI)  | **Yes** — fails when issue count exceeds baseline |
| **P4**   | Informational, cost-deferred, or not yet rolled out           | **No** (disabled or local-only)                   |

Lower P numbers run first in the `build` job where steps are ordered; separate jobs (`knip-report`, `nx-circular-dependencies`) run in parallel with `build` on pull requests.

## `typecheck-tests` versus `test`

The P0 gate **`typecheck-tests`** is **not** a test runner. It runs `tsc --noEmit` against each project’s `tsconfig.test.json` and only verifies that test files compile. It **does not** load Vitest or execute `describe` / `it` bodies.

The P2 gate **`test`** runs Vitest and **does** execute test bodies. A PR can pass P0 `typecheck-tests` while still failing P2 (or local `pnpm nx run <project>:test`) if assertions or runtime mocks are wrong.

See [CONTRIBUTING.md](../../CONTRIBUTING.md#testing-typecheck-tests-versus-test) for contributor-oriented commands and [MONOREPO.md](../../MONOREPO.md#typecheck-tests-versus-test).

## Gate table (P0–P4)

| Priority | Gate                                          | CI job / step                              | Command / target                                                                                                              | Owner                                     | Merge blocker    | Status                                                                    |
| -------- | --------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------- | ------------------------------------------------------------------------- |
| **P0**   | Affected GraphQL + React Router codegen drift | `build` → Codegen Tasks                    | `nx affected --target=codegen-graphql,codegen-react-router` then `git diff --exit-code`                                       | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                    |
| **P0**   | Lint, typecheck, typecheck-tests (affected)   | `build`                                    | `nx affected --target=lint,typecheck,typecheck-tests`                                                                         | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                    |
| **P1**   | Nx project graph circular dependencies        | `nx-circular-dependencies`                 | `pnpm exec tsx ./scripts/nx-circular-dependencies.ts`                                                                         | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                    |
| **P1**   | Root `schema.gql` matches server schema       | `build`                                    | `nx run openthrottle-server:verify-graphql-schema-sync`                                                                       | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                    |
| **P1**   | Agentic Ralph GraphQL codegen drift           | `build` → GraphQL codegen drift guard      | `nx run-many --target=verify-graphql-codegen --projects=@openthrottle/openthrottle-agentic-ralph,@openthrottle/mcp-developer` | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                    |
| **P1**   | MCP developer GraphQL codegen drift           | `build` → GraphQL codegen drift guard      | (same step as Agentic Ralph row)                                                                                              | [visormatt](https://github.com/visormatt) | Yes              | **On**                                                                    |
| **P2**   | Vitest (phased: server, MCP, workflows)       | `build` → NX affected Vitest (phased gate) | `nx affected --target=test` with exclude `*,!openthrottle-server,!@openthrottle/mcp-developer,!@tools/workflows`              | [visormatt](https://github.com/visormatt) | Yes (affected)   | **On** (phased)                                                           |
| **P3**   | Knip dead-code baseline                       | `knip-report`                              | `nx run monorepo:knip-ci` — see [Knip.md](./Knip.md)                                                                          | [visormatt](https://github.com/visormatt) | Yes (regression) | **On**                                                                    |
| **P4**   | Full monorepo `test` (all apps/packages)      | — (commented `parallelize-tasks` matrix)   | `scripts/parallelize-tasks.ts` + `nx affected --target=test`                                                                  | [visormatt](https://github.com/visormatt) | —                | **Off** — track via OT plan _Improve test coverage and CI test execution_ |
| **P4**   | Knip report without baseline (local / ad hoc) | —                                          | `nx run monorepo:knip`                                                                                                        | [visormatt](https://github.com/visormatt) | No               | Local / optional                                                          |
| **P4**   | Nx dependency graph HTML artifact             | `nx-dependency-graph`                      | `scripts/nx-dependency-graph.ts`                                                                                              | [visormatt](https://github.com/visormatt) | No               | **Off** (`if: false`) — see [nx-graph.md](./nx-graph.md)                  |
| **P4**   | `nx release` publish                          | `nx-release` workflow                      | `nx release`                                                                                                                  | [visormatt](https://github.com/visormatt) | No               | **Off** (workflow disabled)                                               |

**Owner** is the GitHub username accountable for keeping the gate green, tuning scope, and owning follow-up OT plans. Infra gates (P0–P1, workflow wiring) and phased test rollout are currently owned by **visormatt**; expand owners when another maintainer takes a gate (update this table in the same PR).

## Phased test gate (P2)

The P2 gate intentionally does **not** run Vitest for the full monorepo. Only these projects are in the allowlist when affected:

- `openthrottle-server`
- `@openthrottle/mcp-developer`
- `@tools/workflows`

React Router applications (for example `openthrottle-developer`) and other packages remain out of CI test until their suites are stable. Expanding P2 is tracked under **Improve test coverage and CI test execution** (OpenThrottle).

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
pnpm dlx nx affected --target=lint,typecheck,typecheck-tests --parallel

# P1 — circular deps
pnpm exec tsx ./scripts/nx-circular-dependencies.ts
pnpm nx run openthrottle-server:verify-graphql-schema-sync
pnpm nx run-many --target=verify-graphql-codegen --projects=@openthrottle/openthrottle-agentic-ralph,@openthrottle/mcp-developer

# P2 — phased tests
pnpm dlx nx affected --target=test \
  --exclude='*,!openthrottle-server,!@openthrottle/mcp-developer,!@tools/workflows' \
  --parallel --nxBail

# P3 — Knip baseline
pnpm nx run monorepo:knip-ci
```

For report-only Knip without the baseline gate, use `pnpm nx run monorepo:knip` ([Knip.md](./Knip.md)).

## See also

- [NX.md](./NX.md) — Nx CI patterns and caching
- [Knip.md](./Knip.md) — report vs fix, CI baseline
- [nx-graph.md](./nx-graph.md) — dependency graph and cycles
