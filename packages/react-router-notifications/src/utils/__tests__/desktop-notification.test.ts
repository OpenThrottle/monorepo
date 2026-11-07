/**
 * @description With `window.openthrottleDesktop` present, system notifications go
 * through the Electron bridge instead of the Web Notifications API; without it the
 * Web path in system-notification.test.ts is unchanged.
 */

import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { NOTIFICATIONS_STORAGE_KEY } from '../../config/index';
import { showSystemNotification } from '../system-notification';

const payload = {
  link: '/plans/24f3510f-6cc5-4f70-a01d-62ddbbdb3f94',
  message: 'Plan finished',
  severity: 'success' as const,
  timestamp: new Date().toISOString(),
};

describe('showSystemNotification with the desktop bridge', () => {
  let storage: Record<string, string>;
  let webNotification: ReturnType<typeof vi.fn>;
  let notify: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage = {};
    webNotification = vi.fn();
    notify = vi.fn(() => Promise.resolve({ ok: true, shown: true }));

    vi.stubGlobal('window', {
      Notification: Object.assign(webNotification, { permission: 'granted' }),
      focus: vi.fn(),
      isSecureContext: true,
      localStorage: {
        getItem: (key: string) => storage[key] ?? null,
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
      },
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { visibilityState: 'visible' },
    });
    vi.stubGlobal('openthrottleDesktop', {
      notify,
      openExternal: vi.fn(),
      platform: 'darwin',
      version: '1.0.0',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('hands the notification to the bridge, not the Web API', () => {
    showSystemNotification(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, payload);

    expect(notify).toHaveBeenCalledWith({
      body: 'Severity: success',
      link: payload.link,
      title: 'Plan finished',
    });
    expect(webNotification).not.toHaveBeenCalled();
  });

  test('does not require the browser preference or permission', () => {
    storage[NOTIFICATIONS_STORAGE_KEY] = '';

    showSystemNotification(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, payload);

    expect(notify).toHaveBeenCalledOnce();
  });

  test('honors an explicit opt-out', () => {
    storage[NOTIFICATIONS_STORAGE_KEY] = JSON.stringify({ enabled: false });

    showSystemNotification(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, payload);

    expect(notify).not.toHaveBeenCalled();
    expect(webNotification).not.toHaveBeenCalled();
  });

  test('swallows a failing bridge call', () => {
    notify.mockReturnValueOnce(Promise.reject(new Error('boom')));

    expect(() => {
      showSystemNotification(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, payload);
    }).not.toThrow();
  });

  test('falls back to the Web API when the bridge is absent', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('window', {
      Notification: Object.assign(webNotification, { permission: 'granted' }),
      focus: vi.fn(),
      isSecureContext: true,
      localStorage: {
        getItem: () => JSON.stringify({ enabled: true }),
        setItem: () => undefined,
      },
    });

    showSystemNotification(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, payload);

    expect(webNotification).toHaveBeenCalledOnce();
    expect(notify).not.toHaveBeenCalled();
  });
});
