import { describe, expect, test } from 'vitest';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { isNotificationEventName } from '../is-notification-event-name';

describe('isNotificationEventName', () => {
  test('returns true for every known event option value', () => {
    expect(isNotificationEventName(NOTIFICATION_EVENT_NAMES.PLAN_UPDATED)).toBe(
      true,
    );
    expect(isNotificationEventName(NOTIFICATION_EVENT_NAMES.DEBUG)).toBe(true);
    expect(isNotificationEventName(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT)).toBe(
      true,
    );
  });

  test('returns false for an unknown string', () => {
    expect(isNotificationEventName('not.a.real.event')).toBe(false);
  });

  test('returns false for an empty string', () => {
    expect(isNotificationEventName('')).toBe(false);
  });
});
