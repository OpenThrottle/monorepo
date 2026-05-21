import { describe, expect, test } from 'vitest';
import { NOTIFICATION_PREFERENCE_ROWS } from '~/routing/settings/config/notification-preferences';
import { getDefaultNotificationSettings } from '../parsers';

describe('routing/settings utils parsers', () => {
  test('getDefaultNotificationSettings mirrors config defaultEnabled flags', () => {
    const settings = getDefaultNotificationSettings();

    for (const row of NOTIFICATION_PREFERENCE_ROWS) {
      expect(settings[row.id]).toBe(row.defaultEnabled);
    }
  });
});
