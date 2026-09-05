import type { NotificationPreferenceId } from '~/routing/settings/config/notification-preferences';
import { NOTIFICATION_PREFERENCE_ROWS } from '~/routing/settings/config/notification-preferences';

export const getDefaultNotificationSettings = (): Record<
  NotificationPreferenceId,
  boolean
> => {
  const next: Record<NotificationPreferenceId, boolean> = {
    assignments: false,
    pullRequests: false,
    queues: false,
    weeklyDigest: false,
  };

  for (const row of NOTIFICATION_PREFERENCE_ROWS) {
    next[row.id] = row.defaultEnabled;
  }

  return next;
};
