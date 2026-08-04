/**
 * @description Minimal OpenThrottle client for Ralph (plan and task flows): get/update plan and task, format prompt context.
 * Default transport is GraphQL (`executeWorkflowGraphqlV2` + codegen documents). Roll back with
 * `WORKFLOW_RALPH_TRANSPORT=postgres-direct`.
 *
 * All workflow entry points require OpenThrottle at startup; use {@link getOpenThrottleConfigOrExit} and
 * {@link ensureDatabaseReachableOrExit} for a single fail-fast flow.
 */

import { resolveWorkflowAuthTokenFromEnv } from '@openthrottle/openthrottle-agentic-ralph';
import {
  appendPlanOutputGraphql,
  bumpCliPlanRunHeartbeatGraphql,
  ensureGraphqlIsReachable,
  ensureProjectForNxNameGraphql,
  getPlanByIdGraphql,
  getTaskByIdGraphql,
  getTasksByPlanIdGraphql,
  insertCommitLinkGraphql,
  listPlansByStatusGraphql,
  listProjectsGraphql,
  readPlanRunCancelMarkerGraphql,
  registerCliPlanRunGraphql,
  registerPlanRunWorktreeCheckoutGraphql,
  settleCliPlanRunGraphql,
  updatePlanProjectIdGraphql,
  updatePlanStatusGraphql,
  updateTaskStatusGraphql,
} from './openthrottle-ralph-graphql';
import {
  appendPlanOutputPostgres,
  bumpCliPlanRunHeartbeatPostgres,
  ensureOpenThrottleReachablePostgres,
  ensureProjectForNxNamePostgres,
  getPlanByIdPostgres,
  getTaskByIdPostgres,
  getTasksByPlanIdPostgres,
  insertCommitLinkPostgres,
  listPlansByStatusPostgres,
  listProjectsPostgres,
  RALPH_FATAL_UNREACHABLE_SUFFIX,
  readPlanRunCancelMarkerPostgres,
  registerCliPlanRunPostgres,
  settleCliPlanRunPostgres,
  updatePlanProjectIdPostgres,
  updatePlanStatusPostgres,
  updateTaskStatusPostgres,
} from './openthrottle-ralph-postgres';
import type {
  CliPlanRunCancelMarker,
  CommitLinkInput,
  CommitLinkRow,
  ListPlansByStatusRow,
  PlanRow,
  ProjectRow,
  RegisterCliRunInput,
  RegisterPlanRunWorktreeCheckoutInput,
  RunLocation,
  TaskRow,
  WorkflowRalphConfig,
} from './openthrottle-ralph-types';
import {
  areAllTasksTerminal,
  formatPlanAndTasksForPrompt,
  taskRequirementsFromRow,
} from './openthrottle-ralph-types';
import { resolveWorkflowRalphTransport } from '../config/load-workflow-ralph-config.ts';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import os from 'node:os';
import { ralphDebugLogger } from './ralph-debug-logger';

export type {
  CliPlanRunCancelMarker,
  CommitLinkInput,
  CommitLinkRow,
  ListPlansByStatusRow,
  PlanRow,
  ProjectRow,
  RegisterCliRunInput,
  RegisterPlanRunWorktreeCheckoutInput,
  RunLocation,
  TaskRow,
  WorkflowRalphConfig,
};

export {
  areAllTasksTerminal,
  formatPlanAndTasksForPrompt,
  RALPH_FATAL_UNREACHABLE_SUFFIX,
  taskRequirementsFromRow,
};

export { WORKFLOW_RALPH_TRANSPORT_ENV } from './workflow-transport';
export type { WorkflowRalphTransport } from './workflow-transport';

/** Fatal error prefix used by getOpenThrottleConfigOrExit and ensureDatabaseReachableOrExit for consistent CLI output. */
export const RALPH_FATAL_PREFIX = '\n🚨 FATAL: ';

/** Emoji prefix for validation/not-found fatal errors in workflow bins (e.g. plan not found). Use with console.error. */
export const RALPH_WORKFLOW_FATAL_PREFIX = '🚨 🚨 🚨 ';

/** Shared message when GraphQL workflow env is missing. */
export const RALPH_FATAL_REQUIRED_GRAPHQL = `${RALPH_FATAL_PREFIX}OpenThrottle is required. Set OPENTHROTTLE_WORKFLOWS_AUTH_TOKEN (or OPENTHROTTLE_MCP_AUTH_TOKEN) and API_URL_INTERNAL (or OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL).\n`;

/** Shared message when Postgres env is missing (postgres-direct rollback). */
export const RALPH_FATAL_REQUIRED_POSTGRES = `${RALPH_FATAL_PREFIX}OpenThrottle is required. Set POSTGRES_URL or POSTGRES_* and ensure the database is reachable.\n`;

/** @deprecated Use {@link RALPH_FATAL_REQUIRED_GRAPHQL} or {@link RALPH_FATAL_REQUIRED_POSTGRES}. */
export const RALPH_FATAL_REQUIRED = RALPH_FATAL_REQUIRED_GRAPHQL;

const isPostgresTransport = (config: WorkflowRalphConfig): boolean =>
  config.transport === 'postgres-direct';

/**
 * @description Resolves Ralph config from env without exiting. Returns null when required env is missing.
 */
export const resolveWorkflowRalphConfig = (): WorkflowRalphConfig | null => {
  const transport = resolveWorkflowRalphTransport();

  if (transport === 'postgres-direct') {
    try {
      const connectionString = getPostgresUrl();

      return {
        connectionString,
        transport: 'postgres-direct',
      };
    } catch {
      return null;
    }
  }

  const token = resolveWorkflowAuthTokenFromEnv();
  if (!token) {
    return null;
  }

  return { transport: 'graphql' };
};

/**
 * @description Returns OpenThrottle config or exits with a clear fatal message.
 */
export const getOpenThrottleConfigOrExit = (): WorkflowRalphConfig => {
  const config = resolveWorkflowRalphConfig();

  if (!config) {
    const transport = resolveWorkflowRalphTransport();
    console.error(
      transport === 'postgres-direct'
        ? RALPH_FATAL_REQUIRED_POSTGRES
        : RALPH_FATAL_REQUIRED_GRAPHQL,
    );
    process.exit(1);
  }

  return config;
};

/**
 * @description Verifies OpenThrottle is reachable or exits with a clear message.
 */
export const ensureDatabaseReachableOrExit = async (
  config: WorkflowRalphConfig,
): Promise<void> => {
  try {
    await ensureOpenThrottleReachable(config);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${RALPH_FATAL_PREFIX}${msg}\n`);
    process.exit(1);
  }
};

/**
 * @description Verifies OpenThrottle is reachable before plan/task I/O.
 */
export const ensureOpenThrottleReachable = async (
  config: WorkflowRalphConfig,
): Promise<void> => {
  if (isPostgresTransport(config)) {
    await ensureOpenThrottleReachablePostgres(config);
    return;
  }

  await ensureGraphqlIsReachable();
};

export const getTaskById = async (
  config: WorkflowRalphConfig,
  id: string,
): Promise<TaskRow | null> =>
  isPostgresTransport(config)
    ? getTaskByIdPostgres(config, id)
    : getTaskByIdGraphql(id);

export const listPlansByStatus = async (
  config: WorkflowRalphConfig,
  status: string,
): Promise<ListPlansByStatusRow[]> =>
  isPostgresTransport(config)
    ? listPlansByStatusPostgres(config, status)
    : listPlansByStatusGraphql(status);

export const getPlanById = async (
  config: WorkflowRalphConfig,
  id: string,
): Promise<PlanRow | null> =>
  isPostgresTransport(config)
    ? getPlanByIdPostgres(config, id)
    : getPlanByIdGraphql(id);

export const listProjects = async (
  config: WorkflowRalphConfig,
): Promise<ProjectRow[]> =>
  isPostgresTransport(config)
    ? listProjectsPostgres(config)
    : listProjectsGraphql();

export const ensureProjectForNxName = async (
  config: WorkflowRalphConfig,
  nxProjectName: string,
): Promise<string> =>
  isPostgresTransport(config)
    ? ensureProjectForNxNamePostgres(config, nxProjectName)
    : ensureProjectForNxNameGraphql(nxProjectName);

export const updatePlanProjectId = async (
  config: WorkflowRalphConfig,
  planId: string,
  projectId: string | null,
): Promise<boolean> =>
  isPostgresTransport(config)
    ? updatePlanProjectIdPostgres(config, planId, projectId)
    : updatePlanProjectIdGraphql(planId, projectId);

export const getTasksByPlanId = async (
  config: WorkflowRalphConfig,
  planId: string,
): Promise<TaskRow[]> =>
  isPostgresTransport(config)
    ? getTasksByPlanIdPostgres(config, planId)
    : getTasksByPlanIdGraphql(planId);

/**
 * @description Promotes a plan to `IN_PROGRESS` when its status is not already `IN_PROGRESS`.
 */
export const promotePlanToInProgressIfNeeded = async (
  config: WorkflowRalphConfig,
  planId: string,
): Promise<boolean> => {
  const row = await updatePlanStatus(config, planId, 'IN_PROGRESS');
  return row !== null;
};

export const updateTaskStatus = async (
  config: WorkflowRalphConfig,
  id: string,
  status: string,
): Promise<TaskRow | null> =>
  isPostgresTransport(config)
    ? updateTaskStatusPostgres(config, id, status)
    : updateTaskStatusGraphql(id, status);

export const updatePlanStatus = async (
  config: WorkflowRalphConfig,
  planId: string,
  status: string,
): Promise<PlanRow | null> =>
  isPostgresTransport(config)
    ? updatePlanStatusPostgres(config, planId, status)
    : updatePlanStatusGraphql(planId, status);

/**
 * @description Terminal reconcile for plan completion. Re-fetches the plan's tasks and,
 * if the set is non-empty and every task is terminal (`COMPLETED`/`SKIPPED`), flips the
 * plan to `COMPLETED`. Safe to call on any clean exit path (end of the Ralph loop,
 * max-iterations) so a plan whose tasks are all done is never stranded in `IN_PROGRESS`.
 * Returns `true` when it set the plan to `COMPLETED`, `false` otherwise. Uses the
 * {@link areAllTasksTerminal} predicate.
 */
export const reconcilePlanCompletionIfAllTasksTerminal = async (
  config: WorkflowRalphConfig,
  planId: string,
): Promise<boolean> => {
  const tasks = await getTasksByPlanId(config, planId);
  if (!areAllTasksTerminal(tasks)) {
    return false;
  }

  await updatePlanStatus(config, planId, 'COMPLETED');
  return true;
};

export const appendPlanOutput = async (
  config: WorkflowRalphConfig,
  planId: string,
  content: string,
  iteration?: number | null,
): Promise<void> =>
  isPostgresTransport(config)
    ? appendPlanOutputPostgres(config, planId, content, iteration)
    : appendPlanOutputGraphql(planId, content, iteration);

export const insertCommitLink = async (
  config: WorkflowRalphConfig,
  input: CommitLinkInput,
): Promise<CommitLinkRow> =>
  isPostgresTransport(config)
    ? insertCommitLinkPostgres(config, input)
    : insertCommitLinkGraphql(input);

/**
 * @description Captures where this CLI run is executing ({ hostname, pid, workerId }), mirroring the
 * location shape {@link markRunStarted} stamps for queued runs so a detached CLI run renders the same
 * in the UI run-audit view. `workerId` is optional (the CLI has no BullMQ worker id); pass a stable
 * run identifier or leave it null.
 */
export const captureRunLocation = (workerId?: string | null): RunLocation => ({
  hostname: os.hostname(),
  pid: process.pid,
  workerId: workerId ?? null,
});

/**
 * @description Registers a detached CLI run as a first-class plan_runs row so the UI Kill has a row
 * to stamp the durable cancel marker on. Returns the new plan_run id. No BullMQ job is created.
 */
export const registerCliPlanRun = async (
  config: WorkflowRalphConfig,
  input: RegisterCliRunInput,
): Promise<string> =>
  isPostgresTransport(config)
    ? registerCliPlanRunPostgres(config, input)
    : registerCliPlanRunGraphql(input);

/**
 * @description Reads the newest plan_runs row's cancel marker for a plan (the CLI loop polls this at
 * each iteration boundary). Returns null when the plan has no run row.
 */
export const readPlanRunCancelMarker = async (
  config: WorkflowRalphConfig,
  planId: string,
): Promise<CliPlanRunCancelMarker | null> =>
  isPostgresTransport(config)
    ? readPlanRunCancelMarkerPostgres(config, planId)
    : readPlanRunCancelMarkerGraphql(planId);

/**
 * @description Settles a detached CLI run row on exit: terminal status (COMPLETED/CANCELLED/FAILED)
 * + cleared location columns, keyed on the run id.
 */
export const settleCliPlanRun = async (
  config: WorkflowRalphConfig,
  planRunId: string,
  status: string,
): Promise<void> =>
  isPostgresTransport(config)
    ? settleCliPlanRunPostgres(config, planRunId, status)
    : settleCliPlanRunGraphql(planRunId, status);

/**
 * @description How often the detached CLI loop bumps its plan_runs heartbeat. Mirrors the server's
 * HEARTBEAT_INTERVAL_MS (@openthrottle/nestjs-repositories) — kept as a local constant so this CLI
 * package does not depend on the server package. MUST stay well below the server's STALE_CUTOFF_MS
 * (120s) so a healthy run is never falsely swept.
 */
export const HEARTBEAT_INTERVAL_MS = 15_000;

/**
 * @description Bumps the detached CLI run's liveness heartbeat on its plan_runs row (keyed on the run
 * id). Called on a timer by the CLI loop; a hard crash (SIGKILL/power-loss) that stops the bumps
 * leaves a stale heartbeat the server reader/sweeper treats as dead.
 */
export const bumpCliPlanRunHeartbeat = async (
  config: WorkflowRalphConfig,
  planRunId: string,
): Promise<void> =>
  isPostgresTransport(config)
    ? bumpCliPlanRunHeartbeatPostgres(config, planRunId)
    : bumpCliPlanRunHeartbeatGraphql(planRunId);

/** Service-account bearer prefix (see GlobalAuthGuard: `ot_sa_` first, then JWT). */
const SERVICE_ACCOUNT_TOKEN_PREFIX = 'ot_sa_';

/**
 * @description True when `token` looks like a user JWT suitable for
 * `registerPlanRunWorktreeCheckout` (three segments, not an `ot_sa_` service-account credential).
 * Does not verify the signature — only gates the CLI from intentionally sending a service-account
 * token to a user-JWT-only mutation.
 */
export const isWorkflowActorUserJwt = (token: string | undefined): boolean => {
  if (token === undefined) {
    return false;
  }

  const trimmed = token.trim();
  if (trimmed === '' || trimmed.startsWith(SERVICE_ACCOUNT_TOKEN_PREFIX)) {
    return false;
  }

  const parts = trimmed.split('.');
  return parts.length === 3 && parts.every((part) => part.length > 0);
};

/**
 * @description Once at CLI run-start path resolve: best-effort call
 * `registerPlanRunWorktreeCheckout` as the run actor so a linked worktree can back-fill
 * `plan_runs.checkout_id`. Soft-fails (debug/ warn + continue) when transport is postgres-direct,
 * actor auth is unavailable / is a service-account token, or the GraphQL call fails — never aborts
 * the agent run. Does not pass `ot_sa_` tokens to this mutation. Does not cover provision-time
 * registration from `worktree:new` / `setup_worktree.sh` (deferred follow-up; orphan worktrees
 * stay out of Workspace Settings until a run starts against them).
 */
export const maybeRegisterPlanRunWorktreeCheckout = async (
  config: WorkflowRalphConfig,
  input: RegisterPlanRunWorktreeCheckoutInput,
): Promise<void> => {
  if (isPostgresTransport(config)) {
    ralphDebugLogger.debug(
      'Skipping worktree checkout registration: postgres-direct transport has no actor JWT for registerPlanRunWorktreeCheckout',
      { planRunId: input.planRunId },
    );
    return;
  }

  const token = resolveWorkflowAuthTokenFromEnv();
  if (!isWorkflowActorUserJwt(token)) {
    ralphDebugLogger.debug(
      'Skipping worktree checkout registration: actor user JWT unavailable (missing token or ot_sa_ service-account credential)',
      { planRunId: input.planRunId },
    );
    return;
  }

  try {
    await registerPlanRunWorktreeCheckoutGraphql(input);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `⚠️ Soft-fail worktree checkout registration for run ${input.planRunId} at ${input.filesystemPath}: ${msg}`,
    );
  }
};
