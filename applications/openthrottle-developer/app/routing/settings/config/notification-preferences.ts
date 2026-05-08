/**
 * @description Stub notification preference rows for the settings UI shell.
 * Replace with API-backed types and loader data when persistence is wired.
 */
export const NOTIFICATION_PREFERENCE_ROWS = [
  {
    defaultEnabled: false,
    description: 'Receive a periodic summary of plans and tasks in your inbox.',
    id: 'weeklyDigest',
    label: 'Weekly digest email',
  },
  {
    defaultEnabled: false,
    description: 'When someone assigns you a task or mentions you.',
    id: 'assignments',
    label: 'Assignments and mentions',
  },
  {
    defaultEnabled: false,
    description: 'Alerts when linked pull requests change state.',
    id: 'pullRequests',
    label: 'Pull request activity',
  },
  {
    defaultEnabled: false,
    description: 'When queue jobs or workflows need attention.',
    id: 'queues',
    label: 'Queue and workflow alerts',
  },
] as const;

export type NotificationPreferenceId =
  (typeof NOTIFICATION_PREFERENCE_ROWS)[number]['id'];
