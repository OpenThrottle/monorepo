/**
 * @description Plan fields consumed by {@link formatPlanAndTasksForPrompt}. Kept
 * structural rather than the full `PlanFragment` so both GraphQL fragments and
 * TypeORM plan entities satisfy it — the server lifecycle / job-run hooks pass
 * entity rows (which omit GraphQL-only fields such as `jobRunHooksJson`).
 */
interface FormatPlanForPrompt {
  readonly description?: string | null;
  readonly id: string;
  readonly status: string;
  readonly title: string;
}

/**
 * @description Task fields consumed by {@link formatPlanAndTasksForPrompt}. Loose
 * on purpose so a GraphQL `TaskFragment` or a TypeORM task entity both satisfy it:
 * fragments carry `requirementsJson` (string) and a string `createdAt`; entities
 * carry `requirements` (parsed array) and a `Date` `createdAt`.
 */
interface FormatPlanTaskForPrompt {
  readonly createdAt: string | Date;
  readonly description?: string | null;
  readonly id: string;
  readonly requirements?: unknown[];
  readonly requirementsJson?: string;
  readonly sortOrder?: number | null;
  readonly status: string;
  readonly title: string;
}

export {
  comparePlanTaskListOrder,
  isRunnableRalphTask,
  isRunnerExecutedHookTask,
  pickRalphTaskForIteration,
  sortTasksByPlanListOrder,
} from './plan-task-list-order.ts';
export type { PlanTaskSortFields } from './plan-task-list-order.ts';

/**
 * @description Normalizes a task's requirements from either the GraphQL
 * `requirementsJson` string or a TypeORM entity's parsed `requirements` array.
 * Malformed JSON on a single task must not throw — that would collapse the whole
 * orchestration to `workflow_unhandled` before any iteration runs — so invalid
 * input falls through to the entity array (or an empty list).
 */
const taskRequirementsForPrompt = (
  task: FormatPlanTaskForPrompt,
): readonly unknown[] => {
  if (task.requirementsJson?.trim()) {
    try {
      const parsed: unknown = JSON.parse(task.requirementsJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // fall through to entity requirements array
    }
  }

  return Array.isArray(task.requirements) ? task.requirements : [];
};

/**
 * @description Orders tasks by sortOrder ASC then createdAt ASC — the loose-typed
 * mirror of {@link comparePlanTaskListOrder}, tolerating an optional sortOrder and
 * a string-or-Date createdAt so entity rows sort identically to fragments.
 */
const compareForPrompt = (
  a: Pick<FormatPlanTaskForPrompt, 'createdAt' | 'sortOrder'>,
  b: Pick<FormatPlanTaskForPrompt, 'createdAt' | 'sortOrder'>,
): number => {
  const orderA = a.sortOrder ?? 0;
  const orderB = b.sortOrder ?? 0;

  if (orderA !== orderB) {
    return orderA - orderB;
  }

  return String(a.createdAt).localeCompare(String(b.createdAt));
};

/**
 * @description Injected plan/tasks block for layer-2 agent prompt (parity with
 * `formatPlanAndTasksForPrompt` in `tools/workflows` `openthrottle-ralph.ts`).
 */
export const formatPlanAndTasksForPrompt = (
  plan: FormatPlanForPrompt,
  tasks: readonly FormatPlanTaskForPrompt[],
): string => {
  const orderedTasks = [...tasks].sort(compareForPrompt);
  const lines: string[] = [
    '--- OpenThrottle plan (injected by Ralph from Postgres)',
    '',
  ];

  if (plan) {
    lines.push(`Plan-Id: ${plan.id}`);
    lines.push(`Title: ${plan.title}`);

    if (plan.description) {
      lines.push(`Description: ${plan.description.trim()}`);
    }

    if (plan.status) {
      lines.push(`Status: ${plan.status}`);
    }

    lines.push('');
  }

  lines.push('Tasks:');

  if (orderedTasks.length === 0) {
    lines.push('  (none)');
  } else {
    for (const t of orderedTasks) {
      lines.push(`  - ${t.id}  ${t.title}  (${t.status})`);

      if (t.description?.trim()) {
        lines.push(`    ${t.description.trim().replace(/\n/g, ' ')}`);
      }

      const requirements = taskRequirementsForPrompt(t);

      if (requirements.length > 0) {
        lines.push(`    Requirements: ${requirements.map(String).join(', ')}`);
      }
    }
  }

  lines.push('', '---');

  return lines.join('\n');
};
