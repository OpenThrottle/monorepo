/**
 * @description Shared notification contract for OpenThrottle. Real-time delivery is
 * over GraphQL subscriptions (graphql-ws), not Socket.IO. These exports are the
 * event-name discriminator and severity source of truth; on-the-wire payloads are the
 * code-first NotificationEvent types in the server GraphQL schema.
 * Import from @openthrottle/openthrottle-notifications in openthrottle-server and openthrottle-developer.
 */

export { NOTIFICATION_EVENT_NAMES } from './events.ts';
export { NOTIFICATION_SEVERITIES } from './types.ts';

export type {
  DebugPayload,
  NotificationEventMap,
  NotificationEventName,
  NotificationPayload,
  NotificationPayloadBase,
  PlanEnqueuedPayload,
  PlanStatusChangedPayload,
  PlanUpdatedPayload,
  PlanWaitingForWorktreePayload,
  QueueJobCompletedPayload,
  StatusChangeBase,
  StatusChangePayload,
  SystemAlertPayload,
  TaskCompletedPayload,
  TaskStatusChangedPayload,
} from './events.ts';
export type { NotificationSeverity } from './types.ts';
