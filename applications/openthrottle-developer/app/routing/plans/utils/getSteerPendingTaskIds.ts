import type {
  PlanInboxMessageFragment,
  PlanTaskRowFragment,
} from '~/__generated__/graphql';

/**
 * @description Ids of IN_PROGRESS tasks that a still-waiting STEER message is
 * about, so the task list can flag the work the human has redirected but the run
 * has not read yet. Derived from the loaded inbox, so it needs no query.
 */
export const getSteerPendingTaskIds = (
  messages: readonly PlanInboxMessageFragment[],
  tasks: readonly PlanTaskRowFragment[],
): ReadonlySet<string> => {
  const inProgressIds = new Set(
    tasks
      .filter((task) => task.status === 'IN_PROGRESS')
      .map((task) => task.id),
  );
  const pending = new Set<string>();

  for (const message of messages) {
    const { kind, status, taskId } = message;
    if (kind !== 'STEER' || status !== 'PENDING' || taskId == null) continue;
    if (inProgressIds.has(taskId)) pending.add(taskId);
  }

  return pending;
};
