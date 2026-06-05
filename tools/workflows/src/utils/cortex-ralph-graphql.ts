/**
 * @description GraphQL transport for Ralph plan/task I/O (`executeWorkflowGraphqlV2` + codegen documents).
 */

import type {
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
  LinkCommitDocument,
  ListPlansByStatusDocument,
  UpdatePlanDocument,
  UpdateTaskDocument,
} from '@openthrottle/openthrottle-agentic-ralph';
import { executeWorkflowGraphqlV2 } from '@openthrottle/openthrottle-agentic-ralph';
import { ralphDebugLogger } from './ralph-debug-logger';
import type {
  CommitLinkInput,
  CommitLinkRow,
  ListPlansByStatusRow,
  PlanRow,
  ProjectRow,
  TaskRow,
} from './cortex-ralph-types';
import { taskRequirementsFromRow } from './cortex-ralph-types';

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
    status: task.status,
    title: task.title,
    updatedAt: toIsoString(task.updatedAt),
  };
};

/**
 * @description GraphQL read-before-write preflight (the single documented exception).
 */
export async function ensureCortexReachableGraphql(): Promise<void> {
  const result = await executeWorkflowGraphqlV2(GetServerHealthDocument, {});
  const database = result.serverHealth.database?.trim().toLowerCase();

  if (database === 'ok') {
    return;
  }

  const detail =
    database === 'unconfigured'
      ? 'OpenThrottle database is not configured on the server.'
      : `OpenThrottle database is unreachable (serverHealth.database=${result.serverHealth.database}).`;

  throw new Error(
    `${detail} Check API_URL_INTERNAL / OPENTHROTTLE_WORKFLOWS_GRAPHQL_URL and server connectivity.`,
  );
}

export async function updatePlanSummaryGraphql(
  planId: string,
  summary: string,
): Promise<PlanRow | null> {
  const result = await executeWorkflowGraphqlV2(UpdatePlanDocument, {
    input: { id: planId, summary },
  });

  return result.updatePlan ? planFragmentToRow(result.updatePlan) : null;
}

export async function updateTaskSummaryGraphql(
  taskId: string,
  summary: string,
): Promise<boolean> {
  const result = await executeWorkflowGraphqlV2(UpdateTaskDocument, {
    input: { id: taskId, summary },
  });

  return result.updateTask != null;
}

export async function getTaskByIdGraphql(id: string): Promise<TaskRow | null> {
  const result = await executeWorkflowGraphqlV2(GetTaskDocument, { id });
  return result.task ? taskFragmentToRow(result.task) : null;
}

export async function listPlansByStatusGraphql(
  status: string,
): Promise<ListPlansByStatusRow[]> {
  const result = await executeWorkflowGraphqlV2(ListPlansByStatusDocument, {
    input: { statuses: [status] },
  });

  return result.listPlansByStatus.plans.map((plan) => ({
    createdAt: toIsoString(plan.createdAt),
    id: plan.id,
    status: plan.status,
    title: plan.title,
  }));
}

export async function getPlanByIdGraphql(id: string): Promise<PlanRow | null> {
  const result = await executeWorkflowGraphqlV2(GetPlanDocument, { id });
  return result.plan ? planFragmentToRow(result.plan) : null;
}

export async function listProjectsGraphql(): Promise<ProjectRow[]> {
  const result = await executeWorkflowGraphqlV2(GetProjectsDocument, {});

  return result.projects.map((project) => ({
    id: project.id,
    name: project.name,
    nxProjectName: project.nxProjectName ?? null,
  }));
}

export async function ensureProjectForNxNameGraphql(
  nxProjectName: string,
): Promise<string> {
  const result = await executeWorkflowGraphqlV2(GetProjectsDocument, {});
  const existing = result.projects.find(
    (project) => project.nxProjectName === nxProjectName,
  );

  if (existing) {
    return existing.id;
  }

  const created = await executeWorkflowGraphqlV2(CreateProjectDocument, {
    input: { name: nxProjectName, nxProjectName },
  });

  return created.createProject.id;
}

export async function updatePlanProjectIdGraphql(
  planId: string,
  projectId: string | null,
): Promise<boolean> {
  const result = await executeWorkflowGraphqlV2(UpdatePlanDocument, {
    input: { id: planId, projectId },
  });

  return result.updatePlan != null;
}

export async function getTasksByPlanIdGraphql(
  planId: string,
): Promise<TaskRow[]> {
  const result = await executeWorkflowGraphqlV2(GetTasksByPlanIdDocument, {
    input: { planId },
  });

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

  const result = await executeWorkflowGraphqlV2(UpdatePlanDocument, {
    input: { id: planId, status },
  });

  return result.updatePlan ? planFragmentToRow(result.updatePlan) : null;
}

export async function updateTaskStatusGraphql(
  id: string,
  status: string,
): Promise<TaskRow | null> {
  const result = await executeWorkflowGraphqlV2(UpdateTaskDocument, {
    input: { id, status },
  });

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

  await executeWorkflowGraphqlV2(AppendPlanOutputDocument, {
    input: { content, iteration: iteration ?? null, planId },
  });
}

export async function insertCommitLinkGraphql(
  input: CommitLinkInput,
): Promise<CommitLinkRow> {
  const result = await executeWorkflowGraphqlV2(LinkCommitDocument, {
    input: {
      message: input.message ?? null,
      planId: input.planId,
      repo: input.repo,
      sha: input.sha,
      taskId: input.taskId ?? null,
    },
  });

  const link = result.linkCommit;

  return {
    createdAt: toIsoString(link.createdAt),
    id: link.id,
    message: link.message ?? null,
    planId: link.planId,
    repo: link.repo,
    sha: link.sha,
    taskId: link.taskId ?? null,
  };
}
