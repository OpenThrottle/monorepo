import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { NotificationsSocketContext } from '../../components/NotificationsSocketContext';
import type { NotificationsSocketContextValue } from '../../components/NotificationsSocketContext';
import { useNotificationsSocketEventSubscription } from '../useNotificationsSocketEventSubscription';

const createWrapper =
  (value: NotificationsSocketContextValue | null) =>
  ({ children }: { readonly children: React.ReactNode }) => (
    <NotificationsSocketContext.Provider value={value}>
      {children}
    </NotificationsSocketContext.Provider>
  );

describe('useNotificationsSocketEventSubscription', () => {
  test('forwards events from subscribeToNotifications', () => {
    const onEvent = vi.fn();
    let capturedListener:
      | ((event: string, payload: unknown) => void)
      | undefined;

    const contextValue: NotificationsSocketContextValue = {
      socket: null,
      status: 'connected',
      subscribeToNotifications: (listener) => {
        capturedListener = listener;

        return () => {
          capturedListener = undefined;
        };
      },
    };

    renderHook(() => useNotificationsSocketEventSubscription(onEvent), {
      wrapper: createWrapper(contextValue),
    });

    capturedListener?.('plan.status_changed', { planId: 'p1' });

    expect(onEvent).toHaveBeenCalledWith('plan.status_changed', {
      planId: 'p1',
    });
  });

  test('does not subscribe when outside provider', () => {
    const onEvent = vi.fn();

    renderHook(() => useNotificationsSocketEventSubscription(onEvent), {
      wrapper: createWrapper(null),
    });

    expect(onEvent).not.toHaveBeenCalled();
  });

  test('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn();
    const onEvent = vi.fn();

    const contextValue: NotificationsSocketContextValue = {
      socket: null,
      status: 'connected',
      subscribeToNotifications: () => unsubscribe,
    };

    const { unmount } = renderHook(
      () => useNotificationsSocketEventSubscription(onEvent),
      { wrapper: createWrapper(contextValue) },
    );

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
