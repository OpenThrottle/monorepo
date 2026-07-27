/**
 * @description GraphQL transport for Ralph plan/task I/O (`executeWorkflowGraphqlV2` + codegen documents).
 */

import type {
  GraphqlV2Failure,
  PlanFragment,
  TaskFragment,
} from '@openthrottle/openthrottle-agentic-ralph';
import {
  AppendPlanOutputDocument,
  CreateProjectDocument,
  GetPlanDocument,
  GetProjectsDocument,
  GetServerHealthDocument,
  GetTaskDocument,
  GetTasksByPlanIdDocument,
  ListPlansByStatusDocument,
  RalphAttachWorkSessionSubjectDocument,
  RalphEndWorkSessionDocument,
  RalphRecordWorkArtifactDocument,
  RalphStartWorkSessionDocument,
  ReadPlanRunCancelMarkerDocument,
  RecordPlanRunHeartbeatDocument,
  RegisterCliPlanRunDocument,
  SettleCliPlanRunDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
} from '@openthrottle/openthrottle-agentic-ralph';
import {
  executeWorkflowGraphqlV2,
  unwrapWorkflowGraphqlResult,
  WorkflowGraphqlError,
} from '@openthrottle/openthrottle-agentic-ralph';
import { ralphDebugLogger } from './ralph-debug-logger';
import type {
  CliPlanRunCancelMarker,
  CommitLinkInput,
  CommitLinkRow,
  ListPlansByStatusRow,
  PlanRow,
  ProjectRow,
  RegisterCliRunInput,
  TaskRow,
} from './openthrottle-ralph-types';
import { taskRequirementsFromRow } from './openthrottle-ralph-types';

const normalizeStatus = (status: string): string => status.trim().toUpperCase();

const toIsoString = (value: unknown): string =>
  value instanceof Date
    ? value.toISOString()
    : typeof value === 'string'
      ? value
      : String(value);

/**
 * @description Maps a GraphQL plan fragment to the legacy {@link PlanRow} shape.
 */
export const planFragmentToRow = (plan: PlanFragment): PlanRow => ({
  author: plan.author,
  category: plan.category,
  createdAt: toIsoString(plan.createdAt),
  description: plan.description ?? null,
  id: plan.id,
  status: plan.status,
  summary: plan.summary ?? null,
  title: plan.title,
  updatedAt: toIsoString(plan.updatedAt),
});

/**
 * @description Maps a GraphQL task fragment to the legacy {@link TaskRow} shape.
 */
export const taskFragmentToRow = (task: TaskFragment): TaskRow => {
  let requirements: readonly unknown[] = [];

  try {
    const parsed: unknown = JSON.parse(task.requirementsJson);
    requirements = taskRequirementsFromRow(parsed);
  } catch {
    requirements = [];
  }

  return {
    category: task.category ?? null,
    createdAt: toIsoString(task.createdAt),
    description: task.description ?? null,
    id: task.id,
    planId: task.planId,
    requirements,
    sortOrder: task.sortOrder,
    status: task.status,
    title: task.title,
    updatedAt: toIsoString(task.updatedAt),
  };
};

/**
 * @description Classifies a transport {@link GraphqlV2Failure} into an operator-facing hint for the
 * reachability preflight — the structured `kind` lets us distinguish a down server (`network`), an
 * auth rejection (`http` 401/403), and a server-side error (`graphql_errors` / other `http`) instead
 * of collapsing every fault to one opaque message.
 */
const describeReachabilityFailure = (failure: GraphqlV2Failure): string => {
  switch (failure.kind) {
    case 'graphql_errors':
      return 'OpenThrottle GraphQL returned errors on the health query.';
    case 'http':
      return failure.httpStatus === 401 || failure.httpStatus === 403
        ? `OpenThrottle GraphQL rejected the request (HTTP ${String(failure.httpStatus)} — check the auth token).`
        : `OpenThrottle GraphQL returned HTTP ${String(failure.httpStatus ?? 'error')}.`;
    case 'network':
      return 'OpenThrottle GraphQL is unreachable (network error).';
    default:
      return failure.message;
  }
};

/**
 * @description GraphQL read-before-write preflight (the single documented exception). Branches on the
 * structured {@link GraphqlV2Failure} so transport/auth faults surface a classified message (and the
 * failure `kind`/`httpStatus` stays inspectable on the thrown {@link WorkflowGraphqlError}).
 */
export async function ensureGraphqlIsReachable(): Promise<void> {
  const outcome = await executeWorkflowGraphqlV2(GetServerHealthDocument, {});

  if (!outcome.ok) {
    throw new WorkflowGraphqlError(
      outcome.error,
      `${describeReachabilityFailure(outcome.error)} Check API_URL_INTERNAL / OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL and server connectivity.`,
    );
  }

  const database = outcome.data.serverHealth.database?.trim().toLowerCase();

  if (database === 'ok') {
    return;
  }

  const detail =
    database === 'unconfigured'
      ? 'OpenThrottle database is not configured on the server.'
      : `OpenThrottle database is unreachable (serverHealth.database=${outcome.data.serverHealth.database}).`;

  throw new Error(
    `${detail} Check API_URL_INTERNAL / OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL and server connectivity.`,
  );
}

export async function getTaskByIdGraphql(id: string): Promise<TaskRow | null> {
  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(GetTaskDocument, { id }),
  );
  return result.task ? taskFragmentToRow(result.task) : null;
}

export async function listPlansByStatusGraphql(
  status: string,
): Promise<ListPlansByStatusRow[]> {
  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(ListPlansByStatusDocument, {
      input: { statuses: [status] },
    }),
  );

  return result.listPlansByStatus.plans.map((plan) => ({
    createdAt: toIsoString(plan.createdAt),
    id: plan.id,
    status: plan.status,
    title: plan.title,
  }));
}

export async function getPlanByIdGraphql(id: string): Promise<PlanRow | null> {
  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(GetPlanDocument, { id }),
  );
  return result.plan ? planFragmentToRow(result.plan) : null;
}

export async function listProjectsGraphql(): Promise<ProjectRow[]> {
  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(GetProjectsDocument, {}),
  );

  return result.projects.map((project) => ({
    id: project.id,
    name: project.name,
    nxProjectName: project.nxProjectName ?? null,
  }));
}

export async function ensureProjectForNxNameGraphql(
  nxProjectName: string,
): Promise<string> {
  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(GetProjectsDocument, {}),
  );
  const existing = result.projects.find(
    (project) => project.nxProjectName === nxProjectName,
  );

  if (existing) {
    return existing.id;
  }

  const created = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(CreateProjectDocument, {
      input: { name: nxProjectName, nxProjectName },
    }),
  );

  return created.createProject.id;
}

export async function updatePlanProjectIdGraphql(
  planId: string,
  projectId: string | null,
): Promise<boolean> {
  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(UpdatePlanDocument, {
      input: { id: planId, projectId },
    }),
  );

  return result.updatePlan != null;
}

export async function getTasksByPlanIdGraphql(
  planId: string,
): Promise<TaskRow[]> {
  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(GetTasksByPlanIdDocument, {
      input: { planId },
    }),
  );

  return result.tasksByPlanId.map(taskFragmentToRow);
}

export async function updatePlanStatusGraphql(
  planId: string,
  status: string,
): Promise<PlanRow | null> {
  if (normalizeStatus(status) === 'IN_PROGRESS') {
    const existing = await getPlanByIdGraphql(planId);
    if (!existing) {
      return null;
    }

    if (normalizeStatus(existing.status) === 'IN_PROGRESS') {
      return null;
    }
  }

  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(UpdatePlanDocument, {
      input: { id: planId, status },
    }),
  );

  return result.updatePlan ? planFragmentToRow(result.updatePlan) : null;
}

export async function updateTaskStatusGraphql(
  id: string,
  status: string,
): Promise<TaskRow | null> {
  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(UpdateTaskDocument, {
      input: { id, status },
    }),
  );

  if (!result.updateTask) {
    return null;
  }

  const taskRow = taskFragmentToRow(result.updateTask);

  if (normalizeStatus(status) === 'IN_PROGRESS') {
    await updatePlanStatusGraphql(taskRow.planId, 'IN_PROGRESS');
  }

  return taskRow;
}

export async function appendPlanOutputGraphql(
  planId: string,
  content: string,
  iteration?: number | null,
): Promise<void> {
  if (!content) {
    return;
  }

  ralphDebugLogger.debug('appendPlanOutput', {
    byteLength: content.length,
    iteration: iteration ?? null,
    planId,
  });

  unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(AppendPlanOutputDocument, {
      input: { content, iteration: iteration ?? null, planId },
    }),
  );
}

/**
 * @description Registers a detached CLI run as a first-class plan_runs row (bullmq_job_id NULL,
 * run_kind 'orchestrator', status IN_PROGRESS) via the registerCliPlanRun mutation, so the UI Kill
 * has a row to stamp the durable cancel marker on. Returns the new plan_run id.
 */
export async function registerCliPlanRunGraphql(
  input: RegisterCliRunInput,
): Promise<string> {
  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(RegisterCliPlanRunDocument, {
      input: {
        executionBackend: input.executionBackend,
        hostname: input.location.hostname,
        pid: input.location.pid,
        planId: input.planId,
        workerId: input.location.workerId,
      },
    }),
  );

  return result.registerCliPlanRun.id;
}

/**
 * @description Reads the NEWEST plan_runs row's cancel marker for a plan (planRunsByPlanId is
 * server-ordered newest-first — this is the row stampCancelRequested marks). Returns null when the
 * plan has no run row.
 */
export async function readPlanRunCancelMarkerGraphql(
  planId: string,
): Promise<CliPlanRunCancelMarker | null> {
  const result = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(ReadPlanRunCancelMarkerDocument, {
      input: { limit: 1, planId },
    }),
  );

  const newest = result.planRunsByPlanId[0];
  if (!newest) {
    return null;
  }

  return {
    cancelRequestedAt: newest.cancelRequestedAt
      ? toIsoString(newest.cancelRequestedAt)
      : null,
    planRunId: newest.id,
    status: newest.status,
  };
}

/**
 * @description Settles a detached CLI run row on exit via the settleCliPlanRun mutation: terminal
 * status (COMPLETED/CANCELLED/FAILED) + cleared location columns. Keyed on the run id.
 */
export async function settleCliPlanRunGraphql(
  planRunId: string,
  status: string,
): Promise<void> {
  unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(SettleCliPlanRunDocument, {
      input: { planRunId, status },
    }),
  );
}

/**
 * @description Bumps the liveness heartbeat on a detached CLI run row via the
 * recordPlanRunHeartbeat mutation, keyed on the run id. The CLI calls this on a ~15s timer so a hard
 * crash (SIGKILL/power-loss) leaves a stale heartbeat the reader/sweeper detects. Rides the existing
 * bearer-token path used by every other CLI graphql op — no new credential.
 */
export async function bumpCliPlanRunHeartbeatGraphql(
  planRunId: string,
): Promise<void> {
  unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(RecordPlanRunHeartbeatDocument, {
      input: { planRunId },
    }),
  );
}

/**
 * @description Records a git commit against a plan/task by orchestrating the generic work-ledger
 * primitives — the linkCommit sugar was fully retired (5b/6). Mirrors {@link insertCommitLinkPostgres}:
 * open an instant `workflow-ralph` session, attach the (plan, task) subject, record a `git_commit`
 * artifact (the server derives its external_key as `github:<repo>@<sha>` and upserts on re-report),
 * then close the session. The artifact enters lifecycle `created`/`unverified`; the git verifier
 * promotes it to `landed`/`verified` (claims-vs-facts) — unlike the postgres twin, which writes
 * `landed` directly. Returns a {@link CommitLinkRow} (id is the artifact uuid) so callers are unaffected.
 */
export async function insertCommitLinkGraphql(
  input: CommitLinkInput,
): Promise<CommitLinkRow> {
  const session = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(RalphStartWorkSessionDocument, {
      input: {
        externalRef: `workflow-ralph:${input.planId}:${input.taskId ?? 'plan'}`,
        toolName: 'workflow-ralph',
      },
    }),
  );
  const sessionId = session.startWorkSession.id;

  unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(RalphAttachWorkSessionSubjectDocument, {
      input: {
        planId: input.planId,
        sessionId,
        taskId: input.taskId ?? null,
      },
    }),
  );

  const artifact = unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(RalphRecordWorkArtifactDocument, {
      input: {
        message: input.message ?? null,
        payloadJson: JSON.stringify({
          landedSha: input.sha,
          repo: input.repo,
          sha: input.sha,
        }),
        sessionId,
        type: 'git_commit',
      },
    }),
  );

  unwrapWorkflowGraphqlResult(
    await executeWorkflowGraphqlV2(RalphEndWorkSessionDocument, {
      input: { sessionId },
    }),
  );

  const row = artifact.recordWorkArtifact;

  return {
    createdAt: toIsoString(row.createdAt),
    id: row.id,
    message: row.message ?? null,
    planId: input.planId,
    repo: input.repo,
    sha: input.sha,
    taskId: input.taskId ?? null,
  };
}
