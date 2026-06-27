/**
 * @description Drives {@link NotificationsSocketProvider} against a mocked
 * `socket.io-client`. Covers status transitions, the `reconnect_attempt`
 * manager-vs-socket registration bug (must be on `socket.io`, not `socket`),
 * cleanup-on-unmount, and that excluded status-change events never reach
 * `onNotification` (provider -> store/toast path; regression guard for P0 #2).
 */

import * as React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  NOTIFICATION_EVENT_NAMES,
  type NotificationEventName,
  type NotificationPayload,
} from '@openthrottle/openthrottle-notifications';

type Handler = (...args: unknown[]) => void;

/** Minimal event-emitter backing both the socket and its manager (`socket.io`). */
class FakeEmitter {
  readonly handlers = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): this {
    const set = this.handlers.get(event) ?? new Set<Handler>();
    set.add(handler);
    this.handlers.set(event, set);
    return this;
  }

  off(event: string, handler: Handler): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }

  hasHandlers(event: string): boolean {
    return (this.handlers.get(event)?.size ?? 0) > 0;
  }
}

class FakeSocket extends FakeEmitter {
  readonly io = new FakeEmitter();
  readonly disconnect = vi.fn();
  readonly removeAllListeners = vi.fn();
}

let currentSocket: FakeSocket;
const ioFactory = vi.fn((): FakeSocket => {
  currentSocket = new FakeSocket();
  return currentSocket;
});

vi.mock('socket.io-client', () => ({
  io: () => ioFactory(),
}));

// Imported after the mock is registered.
const { NotificationsSocketProvider } =
  await import('../NotificationsSocketProvider');
const { useNotificationsSocket } =
  await import('../../hooks/useNotificationsSocket');

function StatusProbe(): React.ReactElement {
  const ctx = useNotificationsSocket();
  return <span data-testid="status">{ctx?.status ?? 'none'}</span>;
}

describe('NotificationsSocketProvider socket wiring', () => {
  beforeEach(() => {
    ioFactory.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('registers reconnect_attempt on the manager (socket.io), not the socket', () => {
    render(
      <NotificationsSocketProvider webSocketUrl="http://localhost:1234">
        <span />
      </NotificationsSocketProvider>,
    );

    // The manager-vs-socket bug: reconnect_attempt is a Manager event in v4.
    expect(currentSocket.io.hasHandlers('reconnect_attempt')).toBe(true);
    expect(currentSocket.hasHandlers('reconnect_attempt')).toBe(false);

    // Connection lifecycle handlers live on the socket itself.
    expect(currentSocket.hasHandlers('connect')).toBe(true);
    expect(currentSocket.hasHandlers('disconnect')).toBe(true);
    expect(currentSocket.hasHandlers('connect_error')).toBe(true);
  });

  test('transitions status from connecting through the socket + manager events', () => {
    const { getByTestId } = render(
      <NotificationsSocketProvider webSocketUrl="http://localhost:1234">
        <StatusProbe />
      </NotificationsSocketProvider>,
    );

    // Effect runs synchronously under render; initial state is 'connecting'.
    expect(getByTestId('status').textContent).toBe('connecting');

    act(() => currentSocket.emit('connect'));
    expect(getByTestId('status').textContent).toBe('connected');

    act(() => currentSocket.emit('disconnect'));
    expect(getByTestId('status').textContent).toBe('disconnected');

    act(() => currentSocket.emit('connect_error'));
    expect(getByTestId('status').textContent).toBe('error');

    // The bug guard: 'reconnecting' is only reached if the handler was registered
    // on the manager (socket.io). Emitting it on the socket itself would do nothing.
    act(() => currentSocket.io.emit('reconnect_attempt'));
    expect(getByTestId('status').textContent).toBe('reconnecting');
  });

  test('cleans up socket + listeners on unmount', () => {
    const { unmount } = render(
      <NotificationsSocketProvider webSocketUrl="http://localhost:1234">
        <span />
      </NotificationsSocketProvider>,
    );

    const socket = currentSocket;
    unmount();

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(socket.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(socket.hasHandlers('connect')).toBe(false);
    expect(socket.io.hasHandlers('reconnect_attempt')).toBe(false);
  });

  test('forwards subscribed notification events to onNotification', () => {
    const onNotification = vi.fn();
    render(
      <NotificationsSocketProvider
        onNotification={onNotification}
        webSocketUrl="http://localhost:1234"
      >
        <span />
      </NotificationsSocketProvider>,
    );

    const payload: NotificationPayload = {
      message: 'Alert',
      severity: 'info',
      timestamp: new Date().toISOString(),
    };
    currentSocket.emit(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, payload);

    expect(onNotification).toHaveBeenCalledWith(
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      payload,
    );
  });

  test('does not forward excluded status-change events to onNotification', () => {
    const onNotification = vi.fn();
    render(
      <NotificationsSocketProvider
        onNotification={onNotification}
        webSocketUrl="http://localhost:1234"
      >
        <span />
      </NotificationsSocketProvider>,
    );

    // These display-less revalidation events are intentionally not subscribed, so
    // emitting them must never reach the store/toast path (no blank toasts).
    const excluded: NotificationEventName[] = [
      NOTIFICATION_EVENT_NAMES.PLAN_STATUS_CHANGED,
      NOTIFICATION_EVENT_NAMES.TASK_STATUS_CHANGED,
    ];
    for (const event of excluded) {
      expect(currentSocket.hasHandlers(event)).toBe(false);
      currentSocket.emit(event, { message: 'should be ignored' });
    }

    expect(onNotification).not.toHaveBeenCalled();
  });
});
