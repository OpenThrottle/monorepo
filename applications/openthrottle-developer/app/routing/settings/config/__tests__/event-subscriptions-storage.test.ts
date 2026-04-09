/**
 * @description Tests for {@link mergeEventSubscriptionPreferencesFromUnknown},
 * localStorage read/write, and cross-tab subscription helpers.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  EVENT_SUBSCRIPTION_ROWS,
  buildInitialSubscriptions,
  type EventSubscriptionId,
} from '~/routing/settings/config/event-subscriptions';
import {
  EVENT_SUBSCRIPTIONS_STORAGE_KEY,
  getEventSubscriptionsFromStorage,
  mergeEventSubscriptionPreferencesFromUnknown,
  setEventSubscriptionsInStorage,
  subscribeToEventSubscriptionsStorageEvents,
} from '~/routing/settings/config/event-subscriptions-storage';

describe('mergeEventSubscriptionPreferencesFromUnknown', () => {
  const defaults = buildInitialSubscriptions();
  const allIds = EVENT_SUBSCRIPTION_ROWS.map((row) => row.id);
  const firstId: EventSubscriptionId = EVENT_SUBSCRIPTION_ROWS[0].id;

  test('returns a copy of defaults when stored is null', () => {
    const merged = mergeEventSubscriptionPreferencesFromUnknown(null, defaults);
    expect(merged).toEqual(defaults);
    expect(merged).not.toBe(defaults);
  });

  test('returns defaults when stored is not a plain object', () => {
    const invalidStored: readonly unknown[] = [
      undefined,
      'string',
      1,
      true,
      [],
      () => {},
    ];
    for (const stored of invalidStored) {
      expect(
        mergeEventSubscriptionPreferencesFromUnknown(stored, defaults),
      ).toEqual(defaults);
    }
  });

  test('returns defaults for empty object (missing keys use defaults)', () => {
    expect(mergeEventSubscriptionPreferencesFromUnknown({}, defaults)).toEqual(
      defaults,
    );
  });

  test('applies boolean overrides only for known ids', () => {
    const firstValue = defaults[firstId];
    const merged = mergeEventSubscriptionPreferencesFromUnknown(
      {
        [firstId]: !firstValue,
        unknownLegacyKey: true,
      },
      defaults,
    );
    expect(merged[firstId]).toBe(!firstValue);
    for (const id of allIds) {
      if (id === firstId) {
        continue;
      }
      expect(merged[id]).toBe(defaults[id]);
    }
    expect(
      Object.prototype.hasOwnProperty.call(merged, 'unknownLegacyKey'),
    ).toBe(false);
  });

  test('ignores non-boolean values for known ids', () => {
    const merged = mergeEventSubscriptionPreferencesFromUnknown(
      {
        [firstId]: 'true',
      },
      defaults,
    );
    expect(merged).toEqual(defaults);
  });

  test('partial object leaves other keys at default', () => {
    const onlyId = allIds[1] ?? firstId;
    const patch = { [onlyId]: !defaults[onlyId] };
    const merged = mergeEventSubscriptionPreferencesFromUnknown(
      patch,
      defaults,
    );
    expect(merged[onlyId]).toBe(!defaults[onlyId]);
    for (const id of allIds) {
      if (id === onlyId) {
        continue;
      }
      expect(merged[id]).toBe(defaults[id]);
    }
  });
});

describe('getEventSubscriptionsFromStorage / setEventSubscriptionsInStorage', () => {
  afterEach(() => {
    window.localStorage.removeItem(EVENT_SUBSCRIPTIONS_STORAGE_KEY);
  });

  test('returns defaults when key is missing', () => {
    window.localStorage.removeItem(EVENT_SUBSCRIPTIONS_STORAGE_KEY);
    expect(getEventSubscriptionsFromStorage()).toEqual(
      buildInitialSubscriptions(),
    );
  });

  test('returns defaults when JSON is invalid', () => {
    window.localStorage.setItem(
      EVENT_SUBSCRIPTIONS_STORAGE_KEY,
      '{not valid json',
    );
    expect(getEventSubscriptionsFromStorage()).toEqual(
      buildInitialSubscriptions(),
    );
  });

  test('merges valid partial JSON with defaults', () => {
    const defaults = buildInitialSubscriptions();
    const firstId = EVENT_SUBSCRIPTION_ROWS[0].id;
    window.localStorage.setItem(
      EVENT_SUBSCRIPTIONS_STORAGE_KEY,
      JSON.stringify({
        [firstId]: !defaults[firstId],
        staleKey: true,
      }),
    );
    const read = getEventSubscriptionsFromStorage();
    expect(read[firstId]).toBe(!defaults[firstId]);
    for (const id of EVENT_SUBSCRIPTION_ROWS.map((row) => row.id)) {
      if (id === firstId) {
        continue;
      }
      expect(read[id]).toBe(defaults[id]);
    }
  });

  test('setEventSubscriptionsInStorage persists full map', () => {
    const next = { ...buildInitialSubscriptions() };
    const id = EVENT_SUBSCRIPTION_ROWS[0].id;
    next[id] = !next[id];
    setEventSubscriptionsInStorage(next);
    const raw = window.localStorage.getItem(EVENT_SUBSCRIPTIONS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(next);
  });

  test('setEventSubscriptionsInStorage swallows quota errors', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    expect(() =>
      setEventSubscriptionsInStorage(buildInitialSubscriptions()),
    ).not.toThrow();
    spy.mockRestore();
  });
});

describe('subscribeToEventSubscriptionsStorageEvents', () => {
  afterEach(() => {
    window.localStorage.removeItem(EVENT_SUBSCRIPTIONS_STORAGE_KEY);
  });

  test('invokes listener when storage event targets subscription key', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToEventSubscriptionsStorageEvents(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: EVENT_SUBSCRIPTIONS_STORAGE_KEY,
        newValue: '{}',
        oldValue: null,
        storageArea: localStorage,
      }),
    );

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  test('does not invoke listener for unrelated keys', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToEventSubscriptionsStorageEvents(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'other-key',
        newValue: 'x',
        oldValue: null,
        storageArea: localStorage,
      }),
    );

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  test('unsubscribe stops further notifications', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToEventSubscriptionsStorageEvents(listener);
    unsubscribe();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: EVENT_SUBSCRIPTIONS_STORAGE_KEY,
        newValue: '{}',
        oldValue: null,
        storageArea: localStorage,
      }),
    );

    expect(listener).not.toHaveBeenCalled();
  });
});
