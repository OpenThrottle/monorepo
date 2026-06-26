/**
 * @description Unit tests for system (desktop) notification helpers.
 * showSystemNotification is gated by: secure context, Notification API, permission,
 * user preference (enabled, onlyWhenBackground), and document visibility.
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import type { NavigateFunction } from 'react-router';
import { NOTIFICATIONS_STORAGE_KEY } from '../../config/index';
import {
  DEFAULT_NOTIFICATIONS_STORAGE_KEY,
  loadFromStorage,
  saveToStorage,
} from '../../data/notifications-store.context';
import type { NotificationInstance } from '../../types';
import {
  getSystemNotificationsPreference,
  setSystemNotificationsPreference,
  showSystemNotification,
} from '../system-notification';

const systemAlertPayload = {
  message: 'Test alert message',
  severity: 'info' as const,
  timestamp: new Date().toISOString(),
};

describe('getSystemNotificationsPreference / setSystemNotificationsPreference', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      clear: () => {
        for (const key of Object.keys(storage)) delete storage[key];
      },
      getItem: (key: string) => storage[key] ?? null,
      key: () => null,
      length: 0,
      removeItem: (key: string) => {
        delete storage[key];
      },
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('getSystemNotificationsPreference returns default when localStorage is empty', () => {
    const pref = getSystemNotificationsPreference();
    expect(pref).toEqual({ enabled: false });
  });

  test('setSystemNotificationsPreference persists and get returns it', () => {
    setSystemNotificationsPreference({ enabled: true });
    expect(getSystemNotificationsPreference()).toEqual({ enabled: true });

    setSystemNotificationsPreference({
      enabled: true,
      onlyWhenBackground: true,
    });
    expect(getSystemNotificationsPreference()).toEqual({
      enabled: true,
      onlyWhenBackground: true,
    });
    expect(JSON.parse(storage[NOTIFICATIONS_STORAGE_KEY] ?? '{}')).toEqual({
      enabled: true,
      onlyWhenBackground: true,
    });
  });
});

describe('preference key vs notification list key', () => {
  let storage: Record<string, string>;

  beforeEach(() => {
    storage = {};
    vi.stubGlobal('localStorage', {
      clear: () => {
        for (const key of Object.keys(storage)) delete storage[key];
      },
      getItem: (key: string) => storage[key] ?? null,
      key: () => null,
      length: 0,
      removeItem: (key: string) => {
        delete storage[key];
      },
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
    });
    vi.stubGlobal('window', { localStorage: globalThis.localStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('preference key and notification list key are distinct', () => {
    expect(NOTIFICATIONS_STORAGE_KEY).not.toBe(
      DEFAULT_NOTIFICATIONS_STORAGE_KEY,
    );
  });

  test('preference and notification list round-trip independently without clobbering', () => {
    const notification: NotificationInstance = {
      createdAt: new Date().toISOString(),
      dismissed: false,
      event: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      id: 'n-1',
      payload: systemAlertPayload,
      read: false,
    };

    // Persist the notification list first.
    saveToStorage(DEFAULT_NOTIFICATIONS_STORAGE_KEY, [notification]);
    // Then persist the preference — must not wipe the list.
    setSystemNotificationsPreference({ enabled: true });

    expect(getSystemNotificationsPreference()).toEqual({ enabled: true });
    expect(loadFromStorage(DEFAULT_NOTIFICATIONS_STORAGE_KEY)).toEqual([
      notification,
    ]);

    // Saving the list again must not wipe the preference.
    saveToStorage(DEFAULT_NOTIFICATIONS_STORAGE_KEY, [notification]);
    expect(getSystemNotificationsPreference()).toEqual({ enabled: true });
  });
});

describe('showSystemNotification', () => {
  let storage: Record<string, string>;
  let mockNotificationCtor: ReturnType<typeof vi.fn>;
  let notificationApi: { permission: string };
  let mockNotificationInstance: {
    close: ReturnType<typeof vi.fn>;
    onclick: (() => void) | null;
  };
  let documentVisibilityState: string;
  let mockNavigate: NavigateFunction;

  const mockLocalStorage = {
    clear: () => {
      for (const key of Object.keys(storage)) delete storage[key];
    },
    getItem: (key: string) => storage[key] ?? null,
    key: () => null,
    length: 0,
    removeItem: (key: string) => {
      delete storage[key];
    },
    setItem: (key: string, value: string) => {
      storage[key] = value;
    },
  };

  beforeEach(() => {
    storage = {};
    mockNavigate = vi.fn();
    documentVisibilityState = 'visible';
    mockNotificationInstance = {
      close: vi.fn(),
      onclick: null,
    };
    class MockNotification {
      static permission = 'granted';

      onclick: (() => void) | null = null;

      constructor(
        _title: string,
        _options?: { body?: string; data?: unknown; tag?: string },
      ) {
        Object.assign(this, mockNotificationInstance);
      }

      close(): void {
        // FIXME:
        (mockNotificationInstance.close as () => void)();
      }
    }

    mockNotificationCtor = vi.fn(MockNotification);
    notificationApi = Object.assign(mockNotificationCtor, {
      permission: 'granted',
    });

    vi.stubGlobal('window', {
      Notification: notificationApi,
      focus: vi.fn(),
      isSecureContext: true,
      localStorage: mockLocalStorage,
    });
    vi.stubGlobal('localStorage', mockLocalStorage);
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        get visibilityState() {
          return documentVisibilityState;
        },
      },
    });
    setSystemNotificationsPreference({ enabled: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('does not create Notification when permission is not granted', () => {
    notificationApi.permission = 'denied';
    showSystemNotification(
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      systemAlertPayload,
      mockNavigate,
    );
    expect(mockNotificationCtor).not.toHaveBeenCalled();
  });

  test('does not create Notification when Notification API is missing', () => {
    vi.stubGlobal('window', {
      focus: vi.fn(),
      isSecureContext: true,
      localStorage: mockLocalStorage,
    });
    showSystemNotification(
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      systemAlertPayload,
      mockNavigate,
    );
    expect(mockNotificationCtor).not.toHaveBeenCalled();
  });

  test('does not create Notification when preference enabled is false', () => {
    setSystemNotificationsPreference({ enabled: false });
    showSystemNotification(
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      systemAlertPayload,
      mockNavigate,
    );
    expect(mockNotificationCtor).not.toHaveBeenCalled();
  });

  test('does not create Notification when onlyWhenBackground is true and tab is visible', () => {
    setSystemNotificationsPreference({
      enabled: true,
      onlyWhenBackground: true,
    });
    documentVisibilityState = 'visible';
    showSystemNotification(
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      systemAlertPayload,
      mockNavigate,
    );
    expect(mockNotificationCtor).not.toHaveBeenCalled();
  });

  test('creates Notification when onlyWhenBackground is true and tab is hidden', () => {
    setSystemNotificationsPreference({
      enabled: true,
      onlyWhenBackground: true,
    });
    documentVisibilityState = 'hidden';
    showSystemNotification(
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      systemAlertPayload,
      mockNavigate,
    );
    expect(mockNotificationCtor).toHaveBeenCalledWith('Test alert message', {
      body: 'Severity: info',
      data: undefined,
      tag: 'openthrottle:system.alert',
    });
  });

  test('creates Notification with correct title, body, tag and data when enabled', () => {
    const payloadWithLink = {
      ...systemAlertPayload,
      link: '/plans/123',
    };
    showSystemNotification(
      NOTIFICATION_EVENT_NAMES.TASK_COMPLETED,
      payloadWithLink,
      mockNavigate,
    );
    expect(mockNotificationCtor).toHaveBeenCalledWith('Test alert message', {
      body: 'Severity: info',
      data: { link: '/plans/123' },
      tag: 'openthrottle:task.completed',
    });
    expect(mockNotificationInstance.onclick).toBeDefined();
  });

  test('creates Notification for payload with link (onclick focuses window and navigates in browser)', () => {
    const payloadWithLink = {
      ...systemAlertPayload,
      link: '/plans/456',
    };
    showSystemNotification(
      NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      payloadWithLink,
      mockNavigate,
    );
    expect(mockNotificationCtor).toHaveBeenCalledWith('Test alert message', {
      body: 'Severity: info',
      data: { link: '/plans/456' },
      tag: 'openthrottle:plan.updated',
    });
  });

  test('creates Notification for payload without link (onclick focuses window only in browser)', () => {
    showSystemNotification(
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      systemAlertPayload,
      mockNavigate,
    );
    expect(mockNotificationCtor).toHaveBeenCalledWith('Test alert message', {
      body: 'Severity: info',
      data: undefined,
      tag: 'openthrottle:system.alert',
    });
  });
});
