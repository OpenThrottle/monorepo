import type { PlanFragment, TaskFragment } from '../__generated__/graphql.js';
import { sortTasksByPlanListOrder } from './plan-task-list-order.ts';

export {
  comparePlanTaskListOrder,
  pickRalphTaskForIteration,
  sortTasksByPlanListOrder,
} from './plan-task-list-order.ts';
export type { PlanTaskSortFields } from './plan-task-list-order.ts';

/**
 * @description Safely parse a task's `requirementsJson` into a list of string
 * requirements. A non-array payload or invalid JSON on a single task must not
 * throw — that would collapse the entire orchestration to `workflow_unhandled`
 * before any iteration runs. Malformed input yields an empty list instead.
 */
const parseRequirements = (requirementsJson: string): string[] => {
  try {
    const parsed: unknown = JSON.parse(requirementsJson);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((requirement) => String(requirement));
  } catch {
    return [];
  }
};

/**
 * @description Injected plan/tasks block for layer-2 agent prompt (parity with
 * `formatPlanAndTasksForPrompt` in `tools/workflows` `openthrottle-ralph.ts`).
 */
export const formatPlanAndTasksForPrompt = (
  plan: PlanFragment,
  tasks: readonly TaskFragment[],
): string => {
  const orderedTasks = sortTasksByPlanListOrder(tasks);
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

      if (t.requirementsJson) {
        const requirements = parseRequirements(t.requirementsJson);

        if (requirements.length > 0) {
          lines.push(`    Requirements: ${requirements.join(', ')}`);
        }
      }
    }
  }

  lines.push('', '---');

  return lines.join('\n');
};
