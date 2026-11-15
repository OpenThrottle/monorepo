/**
 * @description The fields every notification event carries that the `/plans*` revalidation
 * filter reads. Generated subscription payloads are structurally compatible.
 */
export interface PlanLifecycleEventLike {
  readonly event: string;
  // Optional on purpose: only some members of the generated NotificationEvent union select it.
  readonly taskId?: string | null;
}

export interface PlanLifecycleEventFilter {
  /** Event names that should refresh the route. */
  readonly events: readonly string[];
  /** When set, task-scoped events for any other task are ignored; plan-level events still pass. */
  readonly taskId: string | undefined;
}

/**
 * @description The task an event is about, or `null` for a plan-level event.
 */
export function getNotificationTaskId(
  notification: PlanLifecycleEventLike,
): string | null {
  return typeof notification.taskId === 'string' ? notification.taskId : null;
}

/**
 * @description Whether a plan/task notification should revalidate a `/plans*` route: the event
 * must be one the route listens for and, when the route is scoped to a task, be about that task
 * or about no task at all.
 */
export function shouldRevalidateForLifecycleEvent(
  notification: PlanLifecycleEventLike,
  filter: PlanLifecycleEventFilter,
): boolean {
  if (!filter.events.includes(notification.event)) return false;
  if (filter.taskId === undefined) return true;

  const eventTaskId = getNotificationTaskId(notification);

  return eventTaskId === null || eventTaskId === filter.taskId;
}
