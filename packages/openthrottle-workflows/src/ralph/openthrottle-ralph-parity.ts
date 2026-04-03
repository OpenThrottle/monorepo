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
 * ## Behavioral difference: `updatePlanStatus` when status is `IN_PROGRESS`
 *
 * In `cortex-ralph`, transitioning to `IN_PROGRESS` runs
 * `UPDATE … WHERE id = $2 AND status = 'PENDING'` so a plan already completed cannot be forced
 * back to in-progress by mistake. The GraphQL `updatePlan` resolver applies `status` whenever
 * `input.status` is set (no PENDING guard). Callers that need Ralph-equivalent behavior should
 * read the plan first and only call `updatePlan` with `IN_PROGRESS` when the current status is
 * `PENDING` (or mirror the SQL rule in a dedicated server mutation later).
 */

export const OPENTHROTTLE_RALPH_PARITY_NOTE =
  'See openthrottle-ralph-parity.ts for Postgres helpers in cortex-ralph ↔ GraphQL operation mapping.';
