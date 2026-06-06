import type { PlanFragment } from '../../../__generated__/graphql.js';

const comparePlanTaskListOrder = (
  a: { createdAt: string; sortOrder?: number | null },
  b: { createdAt: string; sortOrder?: number | null },
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
 * `formatPlanAndTasksForPrompt` in `tools/workflows` `cortex-ralph.ts`).
 */
export const formatPlanAndTasksForPrompt = (
  plan: PlanFragment,
  // FIXME: __OT_UPDATE__ Lets fix this one
  tasks: any[],
  // tasks: readonly TaskFragment[],
): string => {
  const orderedTasks = [...tasks].sort(comparePlanTaskListOrder);
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
    }
  }

  lines.push('', '---');

  return lines.join('\n');
};
