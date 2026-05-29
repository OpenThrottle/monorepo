import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import type { NotificationPayload } from '@openthrottle/openthrottle-notifications';
import { useWebsocketDebuggerSocketSubscription } from '../use-websocket-debugger-socket-subscription';
import type { WebsocketDebuggerSocket } from '../types';

describe('useWebsocketDebuggerSocketSubscription', () => {
  test('uses subscribeToEvents instead of socket.on when provided', () => {
    const append = vi.fn();
    const socketOn = vi.fn();
    const socket: WebsocketDebuggerSocket = {
      off: vi.fn(),
      on: socketOn,
    };
    const subscribeToEvents = vi.fn(
      (listener: (event: string, payload: NotificationPayload) => void) => {
        listener('plan.status_changed', {
          planId: 'p1',
        } as NotificationPayload);

        return vi.fn();
      },
    );

    renderHook(() =>
      useWebsocketDebuggerSocketSubscription({
        append,
        socket,
        subscribeToEvents,
      }),
    );

    expect(subscribeToEvents).toHaveBeenCalled();
    expect(socketOn).not.toHaveBeenCalled();
    expect(append).toHaveBeenCalledWith('plan.status_changed', {
      planId: 'p1',
    });
  });

  test('attaches socket.on when subscribeToEvents is omitted', () => {
    const append = vi.fn();
    const handlers = new Map<string, (payload: NotificationPayload) => void>();
    const socket: WebsocketDebuggerSocket = {
      off: (event) => {
        handlers.delete(event);
      },
      on: (event, handler) => {
        handlers.set(event, handler);
      },
    };

    renderHook(() =>
      useWebsocketDebuggerSocketSubscription({
        append,
        socket,
      }),
    );

    expect(handlers.size).toBeGreaterThan(0);

    const firstHandler = handlers.values().next().value;

    firstHandler?.({ planId: 'p2' } as NotificationPayload);

    expect(append).toHaveBeenCalled();
  });
});
