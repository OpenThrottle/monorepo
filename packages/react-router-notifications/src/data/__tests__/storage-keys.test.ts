/**
 * @description Guards the two-writer localStorage contract: the system-notification
 * **preference** key ({@link NOTIFICATIONS_STORAGE_KEY}) and the notification **list**
 * key ({@link DEFAULT_NOTIFICATIONS_STORAGE_KEY}) must be distinct and round-trip
 * independently, so neither writer clobbers the other (regression guard for P0 #1).
 */

import { beforeEach, describe, expect, test } from 'vitest';
import { NOTIFICATIONS_STORAGE_KEY } from '../../config/index';
import {
  DEFAULT_NOTIFICATIONS_STORAGE_KEY,
  loadFromStorage,
  saveToStorage,
} from '../notifications-store.context';
import type { NotificationInstance } from '../../types';

function makeNotification(message: string): NotificationInstance {
  return {
    createdAt: new Date().toISOString(),
    dismissed: false,
    event: 'system.alert',
    id: `id-${message}`,
    payload: { message, severity: 'info', timestamp: new Date().toISOString() },
    read: false,
  };
}

describe('notification storage keys', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('preference key and notification-list key are distinct', () => {
    expect(NOTIFICATIONS_STORAGE_KEY).not.toBe(
      DEFAULT_NOTIFICATIONS_STORAGE_KEY,
    );
  });

  test('the two keys round-trip independently without clobbering each other', () => {
    // The preference UI owns NOTIFICATIONS_STORAGE_KEY; the store owns the list key.
    const preference = JSON.stringify({
      enabled: true,
      onlyWhenBackground: false,
    });
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, preference);

    const notifications = [
      makeNotification('first'),
      makeNotification('second'),
    ];
    saveToStorage(DEFAULT_NOTIFICATIONS_STORAGE_KEY, notifications);

    // Writing the list must not touch the preference value.
    expect(window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)).toBe(
      preference,
    );

    // Reading the list back yields exactly what the store persisted.
    const loaded = loadFromStorage(DEFAULT_NOTIFICATIONS_STORAGE_KEY);
    expect(loaded.map((n) => n.payload.message)).toEqual(['first', 'second']);

    // The preference key is not parseable as a notification list and must not leak in.
    expect(loadFromStorage(NOTIFICATIONS_STORAGE_KEY)).toEqual([]);
  });

  test('overwriting the notification list leaves the preference untouched', () => {
    const preference = JSON.stringify({ enabled: false });
    window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, preference);

    saveToStorage(DEFAULT_NOTIFICATIONS_STORAGE_KEY, [makeNotification('a')]);
    saveToStorage(DEFAULT_NOTIFICATIONS_STORAGE_KEY, [makeNotification('b')]);

    expect(window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY)).toBe(
      preference,
    );
    expect(
      loadFromStorage(DEFAULT_NOTIFICATIONS_STORAGE_KEY).map(
        (n) => n.payload.message,
      ),
    ).toEqual(['b']);
  });
});
