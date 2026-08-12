import { describe, expect, test } from 'vitest';
import {
  EVENT_SUBSCRIPTION_ROWS,
  buildInitialSubscriptions,
} from './event-subscriptions';

describe('buildInitialSubscriptions', () => {
  test('produces one toggle per event row, defaulted from its config', () => {
    const initial = buildInitialSubscriptions();

    expect(Object.keys(initial)).toHaveLength(EVENT_SUBSCRIPTION_ROWS.length);
    for (const row of EVENT_SUBSCRIPTION_ROWS) {
      expect(initial[row.id]).toBe(row.defaultSubscribed);
    }
  });

  test('includes both a default-on and a default-off event', () => {
    const initial = buildInitialSubscriptions();

    expect(Object.values(initial)).toContain(true);
    expect(Object.values(initial)).toContain(false);
  });
});
