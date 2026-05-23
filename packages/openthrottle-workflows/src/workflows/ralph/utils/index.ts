import type { PlanFragment } from '../../../__generated__/graphql.js';

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

  if (tasks.length === 0) {
    lines.push('  (none)');
  } else {
    for (const t of tasks) {
      lines.push(`  - ${t.id}  ${t.title}  (${t.status})`);

      if (t.description?.trim()) {
        lines.push(`    ${t.description.trim().replace(/\n/g, ' ')}`);
      }
    }
  }

  lines.push('', '---');

  return lines.join('\n');
};
