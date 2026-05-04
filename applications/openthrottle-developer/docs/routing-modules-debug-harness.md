# Routing modules: debug harness inventory

This document prioritizes **where** unit tests and route fixtures give the best return for debugging and regression safety in **openthrottle-developer**. It complements the code in [`app/testing/route-fixtures.tsx`](../app/testing/route-fixtures.tsx).

## Standard harness (no Storybook)

The monorepo does **not** ship Storybook for this app. The lightweight harness is **Vitest** + **`createRoutesStub`** from React Router, wrapped by:

- `renderRoutesStub` — single route, most isolated components
- `renderRouteHarness` — custom stub route arrays (nested routes, error boundaries)
- `renderWithMemoryRouter` — full `RouterProvider` when navigation matters

Prefer importing these from `~/testing/route-fixtures` instead of duplicating `createRoutesStub` in each test file.

## Tier 1 — highest ROI (complex state, tooling, or operator UX)

| Area                 | Components / routes                                                                                                          | Why                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Plans & workflow     | `PlanToolbar`, `PlanWorkflowConfig*`, `WorkflowRunOptions`, `PlanWorkflowRunTransparency`, `TaskDetails`, `PlanLoggerOutput` | Many branches (Ralph tuning, enqueue, kill run); strongest snapshot + interaction coverage |
| Settings diagnostics | `SettingsDebugPanel`, `SettingsLogsPanel`, `SettingsEnvironmentDiagnostics`, `SettingsPortsTroubleshootingCard`              | Env/storage/health surfaces; easy to break across deploys                                  |
| Queues & jobs        | `QueueJobDetail`, `QueueJobCard`, `QueueForm`                                                                                | Payload display, links to plan/task                                                        |
| Global resilience    | `GlobalErrorBoundary`, `GlobalServerHealthBanner`                                                                            | Error classification and retry UX                                                          |
| Search (power user)  | `SearchForm`, `SearchWhyThisResult`, `SearchPlanCard`                                                                        | Explainability and ranking-sensitive UI                                                    |

## Tier 2 — solid ROI (dashboard, generators, PRs)

| Area             | Components / routes                                                          | Why                                     |
| ---------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| Dashboard        | `DashboardDailyStatsModal`, `DashboardQueueStats`, `DashboardRecentActivity` | Modal and stat cards; snapshot-friendly |
| Generators       | `GeneratorNxBridge`, `GeneratorCard`                                         | Bridge copy and presets                 |
| Home / marketing | `HomeHeroV1`, `HomeFeatures`                                                 | Copy and layout regressions             |
| Cross-links      | `WorkspaceEntityCrossLinks`                                                  | Navigation graph correctness            |

## Incremental adoption checklist

1. New or heavily edited routing components: mount with `renderRoutesStub` (or `renderRouteHarness` when stubs need multiple routes).
2. Prefer targeted snapshots on stable markup (empty states, toolbars) where visual regressions are costly; avoid snapshotting volatile timestamps unless isolated with mocks.
3. Full route modules: keep integration-style tests under `app/routes/__tests__/` when loaders/actions matter.
4. If the workspace later adds Storybook, revisit Tier 1 first—those bundles justify the setup cost.

## Running tests

From the monorepo root:

```bash
pnpm nx run openthrottle-developer:test
```
