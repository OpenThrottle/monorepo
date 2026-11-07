/**
 * Plan auto-close report — the tool-neutral decision.
 *
 * Completing a plan's last open task closes the plan, and a later
 * `create_tasks` then lands on a COMPLETED plan. This module decides, right
 * after a task is completed, whether that completion just closed its plan and
 * what to tell the agent. Each tool's adapter decides which of its tool calls
 * are task updates and how the message is rendered back to its harness.
 *
 * Fail-silent throughout: a lookup that cannot answer cleanly produces no
 * message. A hook that nags because OT was slow is worse than a missed note.
 *
 * @public
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import { logHookError } from '../utils/logging.ts';

const LOOKUP_QUERY = `
query PlanAutoCloseLookup($id: ID!) {
  task(id: $id) { id title planId plan { id status } }
}
`;

/**
 * The task and the current state of its plan, as OT reports them.
 *
 * @public
 */
export interface TaskPlanLookup {
  readonly planId: string;
  readonly planStatus: string;
  readonly taskTitle: string;
}

/** @public */
export type TaskPlanLookupFn = (
  taskId: string,
) => Promise<TaskPlanLookup | null>;

/** True when a status value (any case) is COMPLETED. */
export const isCompletedStatus = (status: unknown): boolean => {
  return typeof status === 'string' && status.toUpperCase() === 'COMPLETED';
};

/**
 * Ask OT for a task's title and its plan's status. Anything short of a clean
 * answer — no endpoint, a network failure, a timeout, an error, a missing task
 * — is null.
 *
 * @public
 */
export const lookupTaskPlan = async ({
  authToken,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  taskId,
  timeoutMs,
}: {
  readonly authToken: string;
  readonly fetchImpl?: typeof globalThis.fetch;
  readonly graphqlUrl: string | null;
  readonly taskId: string;
  readonly timeoutMs: number;
}): Promise<TaskPlanLookup | null> => {
  if (!graphqlUrl || typeof fetchImpl !== 'function') return null;

  try {
    const response = await fetchImpl(graphqlUrl, {
      body: JSON.stringify({ query: LOOKUP_QUERY, variables: { id: taskId } }),
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!isRecord(payload) || !isRecord(payload.data)) return null;
    const { task } = payload.data;
    if (!isRecord(task) || !isRecord(task.plan)) return null;
    const { plan } = task;
    if (
      typeof plan.id !== 'string' ||
      typeof plan.status !== 'string' ||
      typeof task.title !== 'string'
    ) {
      return null;
    }
    return { planId: plan.id, planStatus: plan.status, taskTitle: task.title };
  } catch (err) {
    logHookError('plan-auto-close: OT lookup failed', err);
    return null;
  }
};

/**
 * The note to show after a task update, or null when there is nothing to say.
 * Only a COMPLETED status triggers a lookup, and only a plan that is now
 * COMPLETED produces a message.
 *
 * @public
 */
export const decidePlanAutoClose = async ({
  lookup,
  status,
  taskId,
}: {
  readonly lookup: TaskPlanLookupFn;
  readonly status: unknown;
  readonly taskId: string | null;
}): Promise<string | null> => {
  if (taskId === null || !isCompletedStatus(status)) return null;

  const found = await lookup(taskId);
  if (found === null || !isCompletedStatus(found.planStatus)) return null;

  return `Completing "${found.taskTitle}" closed plan ${found.planId}. If this run has follow-up work, reopen the plan (update_plan IN_PROGRESS) before create_tasks.`;
};
