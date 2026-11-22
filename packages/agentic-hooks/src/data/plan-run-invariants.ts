/**
 * Plan-run invariants — the two status failures of an interactive loop that
 * nothing else catches, as tool-neutral checks over the plan-run binding.
 *
 * - **Double IN_PROGRESS**: a task is about to go IN_PROGRESS while another
 *   task in the bound run still is, which means a step-4 flip was skipped.
 * - **Stranded at Stop**: the turn ends with a task IN_PROGRESS whose work was
 *   already committed with its `Task-Id:` footer, so the flip was forgotten.
 *
 * Both are warnings only: each returns a message for the adapter to show, and
 * neither touches a task. Escalating a check to a deny is a later decision,
 * taken per check after a soak, which is why each check is its own function
 * with its own verdict. Every infrastructure problem (no run, no server, an
 * ambiguous answer) is silence.
 *
 * @public
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import type { HookFetch } from '../types.ts';
import { logHookError } from '../utils/logging.ts';
import type { PlanRunBinding } from './findPlanRunBinding.ts';
import { postGraphqlField } from './graphql.ts';

const IN_PROGRESS = 'IN_PROGRESS';

const IN_PROGRESS_QUERY = `
query PlanRunInvariantTasks($input: TasksByPlanIdInput!) {
  tasksByPlanId(input: $input) { id status }
}
`;

/** `git commit` anywhere in a shell command. */
const GIT_COMMIT = /\bgit\b[^\n|;&]*\bcommit\b/;
/** A `Task-Id:` footer and the id it names. */
const TASK_ID_FOOTER = /Task-Id:\s*([0-9A-Za-z-]+)/g;

/**
 * The ids of a plan's tasks that OT reports IN_PROGRESS, or null when OT
 * cannot answer cleanly.
 *
 * @public
 */
export type InProgressLookupFn = (
  planId: string,
) => Promise<readonly string[] | null>;

const runLabelOf = (binding: {
  readonly planId: string | null;
  readonly planRunId: string | null;
}): string => {
  return binding.planRunId ?? binding.planId ?? 'unknown';
};

const listIds = (ids: readonly string[]): string => {
  return ids.join(', ');
};

/**
 * @description The warning for an `update_task` about to set `status` on
 * `taskId`, or null. The transcript is read first; only when it shows no other
 * task IN_PROGRESS is OT asked, because a task carried over from an earlier
 * session (or outside the read window) is invisible to the transcript.
 * @public
 */
export const decideDoubleInProgress = async ({
  binding,
  lookupInProgress,
  status,
  taskId,
}: {
  readonly binding: PlanRunBinding;
  readonly lookupInProgress: InProgressLookupFn;
  readonly status: unknown;
  readonly taskId: string | null;
}): Promise<string | null> => {
  if (taskId === null || typeof status !== 'string') return null;
  if (status.toUpperCase() !== IN_PROGRESS) return null;
  if (binding.kind !== 'active' || binding.planId === null) return null;

  const isOther = (id: string): boolean => {
    return id !== taskId;
  };
  let others = binding.inProgressTaskIds.filter(isOther);
  if (others.length === 0) {
    others = ((await lookupInProgress(binding.planId)) ?? []).filter(isOther);
  }
  if (others.length === 0) return null;

  const open = listIds(others);
  const isOne = others.length === 1;
  const subject = isOne ? `task ${open} is` : `tasks ${open} are`;
  return `Task ${taskId} is going IN_PROGRESS while ${subject} still IN_PROGRESS in plan run ${runLabelOf(binding)}. A loop works one task at a time: flip ${open} to COMPLETED, BLOCKED or SKIPPED with update_task first.`;
};

/**
 * @description The task ids named by a `Task-Id:` footer in shell commands
 * that run `git commit`.
 * @public
 */
export const committedTaskIdsOf = (
  commands: readonly string[],
): ReadonlySet<string> => {
  const ids = new Set<string>();
  for (const command of commands) {
    if (!GIT_COMMIT.test(command)) continue;
    for (const match of command.matchAll(TASK_ID_FOOTER)) {
      const [, id] = match;
      if (id !== undefined) ids.add(id);
    }
  }
  return ids;
};

/**
 * @description The warning for a turn that ends with a task IN_PROGRESS whose
 * work this session already committed, or null.
 * @public
 */
export const decideStrandedAtStop = ({
  binding,
  committedTaskIds,
}: {
  readonly binding: PlanRunBinding;
  readonly committedTaskIds: ReadonlySet<string>;
}): string | null => {
  if (binding.kind !== 'active') return null;
  const stranded = binding.inProgressTaskIds.filter((id) => {
    return committedTaskIds.has(id);
  });
  if (stranded.length === 0) return null;
  const ids = listIds(stranded);
  return `Task ${ids} in plan run ${runLabelOf(binding)} is still IN_PROGRESS, but its work was committed (Task-Id: footer). Next turn, flip it with update_task to COMPLETED (or BLOCKED / SKIPPED) before starting another task.`;
};

/**
 * Ask OT which of a plan's tasks are IN_PROGRESS. Anything short of a clean
 * answer is null. Never throws.
 *
 * @public
 */
export const lookupInProgressTaskIds = async ({
  authToken,
  fetchImpl = globalThis.fetch,
  graphqlUrl,
  planId,
  timeoutMs,
}: {
  readonly authToken: string;
  readonly fetchImpl?: HookFetch;
  readonly graphqlUrl: string | null;
  readonly planId: string;
  readonly timeoutMs: number;
}): Promise<readonly string[] | null> => {
  try {
    const posted = await postGraphqlField({
      authToken,
      fetchImpl,
      field: 'tasksByPlanId',
      graphqlUrl,
      query: IN_PROGRESS_QUERY,
      timeoutMs,
      variables: { input: { planId } },
    });
    if (!posted.ok || !Array.isArray(posted.data)) return null;
    return posted.data.flatMap((task): string[] => {
      if (!isRecord(task) || typeof task.id !== 'string') return [];
      const isOpen =
        typeof task.status === 'string' &&
        task.status.toUpperCase() === IN_PROGRESS;
      return isOpen ? [task.id] : [];
    });
  } catch (err) {
    logHookError('plan-run-invariants: OT lookup failed', err);
    return null;
  }
};
