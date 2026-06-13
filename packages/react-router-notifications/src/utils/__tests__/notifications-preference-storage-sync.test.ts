/**
 * @description Tests for cross-tab `storage` subscription on {@link NOTIFICATIONS_STORAGE_KEY}.
 */

import { describe, expect, test, vi } from 'vitest';
import { NOTIFICATIONS_STORAGE_KEY } from '../../config/index';
import { subscribeToNotificationsPreferenceStorageEvents } from '../notifications-preference-storage-sync';

describe('subscribeToNotificationsPreferenceStorageEvents', () => {
  test('invokes listener when storage event targets notifications preference key', () => {
    const listener = vi.fn();
    const unsubscribe =
      subscribeToNotificationsPreferenceStorageEvents(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: NOTIFICATIONS_STORAGE_KEY,
        newValue: '{"enabled":true}',
        oldValue: null,
        storageArea: localStorage,
      }),
    );

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  test('does not invoke listener when storage key is unrelated', () => {
    const listener = vi.fn();
    const unsubscribe =
      subscribeToNotificationsPreferenceStorageEvents(listener);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'unrelated-key',
        newValue: 'x',
        oldValue: null,
        storageArea: localStorage,
      }),
    );

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  test('unsubscribe removes listener so later storage events are ignored', () => {
    const listener = vi.fn();
    const unsubscribe =
      subscribeToNotificationsPreferenceStorageEvents(listener);
    unsubscribe();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: NOTIFICATIONS_STORAGE_KEY,
        newValue: '{"enabled":true}',
        oldValue: null,
        storageArea: localStorage,
      }),
    );

    expect(listener).not.toHaveBeenCalled();
  });

  test('notifies multiple subscribers for the same key', () => {
    const a = vi.fn();
    const b = vi.fn();
    const unsubA = subscribeToNotificationsPreferenceStorageEvents(a);
    const unsubB = subscribeToNotificationsPreferenceStorageEvents(b);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: NOTIFICATIONS_STORAGE_KEY,
        newValue: '{"enabled":true}',
        oldValue: null,
        storageArea: localStorage,
      }),
    );

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    unsubA();
    unsubB();
  });
});
