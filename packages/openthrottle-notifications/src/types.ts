/**
 * @description Severity of a notification. Used for styling and filtering.
 */
export const NOTIFICATION_SEVERITIES = [
  'error',
  'info',
  'success',
  'warning',
] as const;

export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];
