import { executeWorkflowGraphqlV2 } from '../workflow-graphql.js';
import {
  GetServerHealthDocument,
  type GetServerHealthQuery,
  type PlanFragment,
  type TaskFragment,
} from '../../../__generated__/graphql.js';

/**
 * @description Injected plan/tasks block for layer-2 agent prompt (parity with
 * `formatPlanAndTasksForPrompt` in `tools/workflows` `cortex-ralph.ts`).
 */
export const formatPlanAndTasksForPrompt = (
  plan: PlanFragment,
  tasks: readonly TaskFragment[],
): string => {
  const lines: string[] = [
    '--- Cortex plan (injected by Ralph from Postgres)',
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

/**
 * @description Runs the public `getServerHealth` query via {@link executeWorkflowGraphqlV2} (throws on
 * failure; error message reflects HTTP status / first GraphQL error). Uses workflow GraphQL env
 * (`OPENTHROTTLE_WORKFLOWS_*`); wrap in try/catch when callers need non-throwing control flow. Optional
 * preflight for api/database/redis/websocket when the HTTP POST succeeds. Does not replace Ralph's
 * Cortex TCP check (`ensureCortexReachableOrExit`). See `tools/workflows/README.md` (getServerHealth vs
 * transport).
 */
export async function fetchServerHealth(): Promise<GetServerHealthQuery> {
  return executeWorkflowGraphqlV2(GetServerHealthDocument, {});
}
