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
 * ## `updatePlanStatus` when status is `IN_PROGRESS` (aligned with cortex-ralph)
 *
 * In `cortex-ralph`, transitioning to `IN_PROGRESS` runs
 * `UPDATE … WHERE id = $2 AND status = 'PENDING'` so a completed plan cannot be forced back to
 * in-progress. **openthrottle-server enforces the same rule on GraphQL:** `updatePlan` only
 * applies `IN_PROGRESS` when the current plan is `PENDING` or already `IN_PROGRESS` (idempotent
 * no-op). Otherwise the status field is left unchanged, matching a conditional UPDATE that updates
 * zero rows. If `IN_PROGRESS` was the only requested change and it is invalid, the resolver
 * responds with `400 Bad Request` and
 * `Cannot transition to IN_PROGRESS: only PENDING plans may enter this state.` If other fields
 * change in the same mutation, those persist and the invalid `IN_PROGRESS` is skipped for status.
 * The `setPlanStatus` mutation applies the same transition rule and throws on invalid `IN_PROGRESS`
 * even when it would otherwise be a no-op.
 */

export const OPENTHROTTLE_RALPH_PARITY_NOTE =
  'See openthrottle-ralph-parity.ts for Postgres helpers in cortex-ralph ↔ GraphQL operation mapping.';
