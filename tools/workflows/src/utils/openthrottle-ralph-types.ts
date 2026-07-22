/**
 * @description Shared Ralph plan/task row types and helpers (transport-agnostic).
 */

import { sortTasksByPlanListOrder } from '@openthrottle/openthrottle-agentic-ralph';
import type { WorkflowRalphTransport } from './workflow-transport';

export interface WorkflowRalphConfig {
  readonly connectionString?: string;
  readonly transport: WorkflowRalphTransport;
}

/**
 * @description Normalizes JSONB task requirements from Postgres to a readonly array.
 */
export const taskRequirementsFromRow = (raw: unknown): readonly unknown[] =>
  Array.isArray(raw) ? raw : [];

export interface TaskRow {
  readonly category: string | null;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly planId: string;
  readonly requirements: readonly unknown[];
  readonly sortOrder: number;
  readonly status: string;
  readonly title: string;
  readonly updatedAt: string;
}

/**
 * @description True when a plan's task set is non-empty and every task is in a
 * terminal state (`COMPLETED` or `SKIPPED`). This is the single source of truth
 * for the "all tasks terminal ⇒ plan should be COMPLETED" rule used by the Ralph
 * CLI loop's terminal reconcile. An empty task set is intentionally NOT considered
 * terminal (a plan with no tasks is not "done").
 */
export const areAllTasksTerminal = (tasks: readonly TaskRow[]): boolean =>
  tasks.length > 0 &&
  tasks.every((t) => t.status === 'COMPLETED' || t.status === 'SKIPPED');

export interface PlanRow {
  readonly author: string;
  readonly category: string;
  readonly createdAt: string;
  readonly description: string | null;
  readonly id: string;
  readonly status: string;
  readonly summary: string | null;
  readonly title: string;
  readonly updatedAt: string;
}

export interface ProjectRow {
  readonly id: string;
  readonly name: string;
  readonly nxProjectName: string | null;
}

export interface ListPlansByStatusRow {
  readonly createdAt: string;
  readonly id: string;
  readonly status: string;
  readonly title: string;
}

/**
 * @description Where a detached CLI run is executing. Mirrors the location columns
 * (hostname/pid/worker_id) that {@link markRunStarted} stamps for queued runs, so the
 * UI's run-audit view renders a CLI run the same way.
 */
export interface RunLocation {
  readonly hostname: string | null;
  readonly pid: number | null;
  readonly workerId: string | null;
}

/** @description Input for registering a detached CLI run as a first-class plan_runs row. */
export interface RegisterCliRunInput {
  readonly executionBackend: string;
  readonly location: RunLocation;
  readonly planId: string;
}

/**
 * @description The newest plan_runs row's durable cancel marker for a plan — what the
 * server's stampCancelRequested stamps and the CLI loop polls each iteration boundary.
 */
export interface CliPlanRunCancelMarker {
  readonly cancelRequestedAt: string | null;
  readonly planRunId: string;
  readonly status: string;
}

export interface CommitLinkInput {
  readonly message: string | null;
  readonly planId: string;
  readonly repo: string;
  readonly sha: string;
  readonly taskId: string | null;
}

export interface CommitLinkRow {
  readonly createdAt: string;
  readonly id: string;
  readonly message: string | null;
  readonly planId: string;
  readonly repo: string;
  readonly sha: string;
  readonly taskId: string | null;
}

/**
 * @description Formats plan and tasks as plain text for injection into the agent prompt.
 */
export const formatPlanAndTasksForPrompt = (
  plan: PlanRow | null,
  tasks: TaskRow[],
): string => {
  const lines: string[] = [
    '--- OpenThrottle plan (injected by Ralph from OpenThrottle)',
    '',
  ];

  if (plan) {
    lines.push(`Plan-Id: ${plan.id}`);
    lines.push(`Title: ${plan.title}`);
    if (plan.description) lines.push(`Description: ${plan.description.trim()}`);
    if (plan.status) lines.push(`Status: ${plan.status}`);
    lines.push('');
  }

  lines.push('Tasks:');
  const orderedTasks = sortTasksByPlanListOrder(tasks);
  if (orderedTasks.length === 0) {
    lines.push('  (none)');
  } else {
    for (const t of orderedTasks) {
      lines.push(`  - ${t.id}  ${t.title}  (${t.status})`);
      if (t.description?.trim()) {
        lines.push(`    ${t.description.trim().replace(/\n/g, ' ')}`);
      }

      if (t.requirements.length > 0) {
        lines.push(
          `    Requirements: ${t.requirements.map(String).join(', ')}`,
        );
      }
    }
  }
  lines.push('', '---');
  return lines.join('\n');
};
