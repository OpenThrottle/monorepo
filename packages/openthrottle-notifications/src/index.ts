/**
 * @description Shared notification contract for OpenThrottle WebSocket events.
 * Import from @openthrottle/openthrottle-notifications in openthrottle-server and openthrottle-developer.
 */

export { NOTIFICATION_EVENT_NAMES } from './events.js';
export { NOTIFICATION_SEVERITIES } from './types.js';

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
  StatusChangePayload,
  SystemAlertPayload,
  TaskCompletedPayload,
  TaskStatusChangedPayload,
} from './events.js';
export type { NotificationSeverity } from './types.js';
