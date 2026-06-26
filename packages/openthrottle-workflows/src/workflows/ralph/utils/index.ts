import type { PlanFragment } from '../../../__generated__/graphql.ts';

/** Task fields consumed by {@link formatPlanAndTasksForPrompt} (GraphQL fragment or TypeORM entity). */
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

/**
 * @description Normalizes task requirements from GraphQL `requirementsJson` or entity `requirements`.
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

const comparePlanTaskListOrder = (
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
  plan: PlanFragment,
  tasks: readonly FormatPlanTaskForPrompt[],
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

      const requirements = taskRequirementsForPrompt(t);

      if (requirements.length > 0) {
        lines.push(`    Requirements: ${requirements.map(String).join(', ')}`);
      }
    }
  }

  lines.push('', '---');

  return lines.join('\n');
};
