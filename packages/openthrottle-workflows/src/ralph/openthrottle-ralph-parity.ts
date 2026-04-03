/**
 * @description Parity map: `tools/workflows/src/utils/cortex-ralph.ts` (direct Postgres) ↔
 * GraphQL documents under `src/ralph/graphql/`. Use this when implementing the
 * GraphQL-first workflow layer so no OpenThrottle data surface is missed.
 *
 * ## Not represented in GraphQL (transport / env)
 *
 * - `getCortexConfigOrExit`, `ensureCortexReachable`, `ensureCortexReachableOrExit` — connection
 *   string and TCP health checks; the HTTP client uses server URL + auth instead.
 *
 * ## Optional GraphQL preflight (`getServerHealth`)
 *
 * - `fetchWorkflowServerHealth` (`workflow-server-health.ts`) runs the public `getServerHealth` query
 *   via `executeWorkflowGraphql`. It complements (does not replace) `WORKFLOW_GRAPHQL_HTTP` /
 *   `mapUnknownToWorkflowGraphqlError`: health JSON is only available after a successful HTTP POST;
 *   wrong URL, TLS, or proxy errors remain transport failures without health fields. Ralph startup
 *   still uses direct Postgres (`ensureCortexReachableOrExit`); see `tools/workflows/README.md`
 *   (section getServerHealth vs WORKFLOW_GRAPHQL_HTTP).
 *
 * ## Queries / mutations (alphabetical by helper in `cortex-ralph.ts`)
 *
 * - `appendPlanOutput` → `appendPlanOutput` mutation (`mutations.graphql`)
 * - `getPlanById` → `getPlan` (`queries.graphql`)
 * - `getTaskById` → `getTask`
 * - `getTasksByPlanId` → `getTasksByPlanId`
 * - `insertCommitLink` → `linkCommit`
 * - `listPlansByStatus` → `listPlansByStatus`
 * - `listProjects` → `getProjects` (filter client-side by `nxProjectName` when matching Nx names)
 * - `ensureProjectForNxName` → `getProjects` then `createProject` if no row matches `nxProjectName`
 * - `updatePlanProjectId` → `updatePlan` with `projectId` / `project` fields (`mutations.graphql`)
 * - `updatePlanSummary` → `updatePlan` with `summary`
 * - `updatePlanStatus` → `updatePlan` with `status` (see behavioral note below)
 * - `updateTaskStatus` → `updateTask` with `status`
 * - `updateTaskSummary` → `updateTask` with `summary`
 *
 * ## `ralph.ts` main() path (minimal subset)
 *
 * Uses only: `getTaskById`, `getPlanById`, `getTasksByPlanId`, `formatPlanAndTasksForPrompt` (pure),
 * `updatePlanStatus`, `updateTaskStatus`. GraphQL covers all data access except prompt formatting.
 *
 * ## Related workflow bins (same `cortex-ralph` module)
 *
 * - `child-job.ts`: `appendPlanOutput`, `getTasksByPlanId`, `updatePlanStatus`
 * - `link-merge.ts`: `insertCommitLink` → `linkCommit`
 *
 * ## `updatePlanStatus` → `IN_PROGRESS` (cortex-ralph ↔ GraphQL)
 *
 * Source of truth: `applications/openthrottle-server/src/graphql/plans/plans.resolver.ts`
 * (`updatePlan`, `setPlanStatus`, `canApplyInProgressAsTargetStatus`).
 *
 * - **Direct Postgres (`cortex-ralph`):** `UPDATE … SET status = 'IN_PROGRESS' WHERE id = $2 AND status = 'PENDING'` — only `PENDING` rows change; no match → `null` (already `IN_PROGRESS` is not a no-op row update, unlike GraphQL below).
 * - **`updatePlan`:** Requesting `IN_PROGRESS` updates status only when current status is `PENDING` or already `IN_PROGRESS` (idempotent `IN_PROGRESS` → `IN_PROGRESS`). Otherwise the invalid transition is skipped (status unchanged); other input fields still apply. If nothing else changed and `IN_PROGRESS` was the only invalid request → `400` with `Cannot transition to IN_PROGRESS: only PENDING plans may enter this state.`
 * - **`setPlanStatus`:** Validates `IN_PROGRESS` first and throws that same `400` when invalid **before** the same-status early return. Valid `IN_PROGRESS` → `IN_PROGRESS` returns the entity without persisting.
 *
 * ## `RalphFlowContext` from GraphQL / queue tuning (`workflow-graphql.ts`)
 *
 * - **`resolveWorkflowRalphRunOptionsShapeFromPlanRunTuning`** — merges `RalphPlanRunTuningInput`
 *   (enqueue mutation `ralph` payload) or worker job tuning with the same fields, plus `planId` and
 *   optional `targetMode` / `taskId`, into `WorkflowRalphRunOptionsShape` using the same defaults as
 *   the developer UI (`WORKFLOW_RALPH_*` in `flow-context.ts`). **`promptFile`** is not part of
 *   `RalphFlowContext` (nested `--prompt-file` only).
 * - **`buildRalphFlowContextFromRunOptionsShape`** — adds `kind`, `mode`, and effective `maxIterations`
 *   (task-centric forces `1`; plan-centric uses `iterations`).
 * - **`buildRalphFlowContextFromPlanRunTuning`** — combines the two for resolved runs (e.g. queue
 *   worker: `planId` from job, `ralph` from `job.data`, `targetMode: 'plan'`). BullMQ jobs remain
 *   plan-scoped; panel `targetMode` / `taskId` affect local CLI preview, not enqueue — same as
 *   `buildRalphPlanRunTuningInputFromWorkflowRunOptions` in the developer app.
 */

export const OPENTHROTTLE_RALPH_PARITY_NOTE =
  'See openthrottle-ralph-parity.ts for Postgres helpers in cortex-ralph ↔ GraphQL operation mapping.';
