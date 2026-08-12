import { act, renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import {
  NOTIFICATION_EVENT_NAMES,
  type NotificationEventName,
  type NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { useOpenThrottleWebsocketDebugger } from '../useOpenThrottleWebsocketDebugger';
import type {
  WebsocketDebuggerEventSubscriber,
  WebsocketDebuggerLogEntry,
} from '../../components/websocket-debugger';

const systemAlertPayload: NotificationPayload = {
  message: 'Test alert',
  severity: 'info',
  timestamp: '2026-05-29T12:00:00.000Z',
};

const planUpdatedPayload: NotificationPayload = {
  message: 'Plan updated',
  planId: 'plan-1',
  severity: 'info',
  timestamp: '2026-05-29T12:00:01.000Z',
};

describe('useOpenThrottleWebsocketDebugger', () => {
  test('starts with no entries and all events selected', () => {
    const { result } = renderHook(() =>
      useOpenThrottleWebsocketDebugger({ subscriptionEnabled: false }),
    );

    expect(result.current.displayEntries).toEqual([]);
    expect(result.current.selectedEventNames.length).toBeGreaterThan(0);
  });

  test('seeds initialEntries in original order, newest first', () => {
    const initialEntries: readonly WebsocketDebuggerLogEntry[] = [
      {
        event: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
        id: 'seed-1',
        payload: systemAlertPayload,
        receivedAt: '2026-05-29T12:00:00.000Z',
      },
      {
        event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
        id: 'seed-2',
        payload: planUpdatedPayload,
        receivedAt: '2026-05-29T12:00:01.000Z',
      },
    ];

    const { result } = renderHook(() =>
      useOpenThrottleWebsocketDebugger({ initialEntries }),
    );

    expect(result.current.displayEntries).toHaveLength(2);
    expect(result.current.displayEntries[0]?.event).toBe(
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
    );
    expect(result.current.displayEntries[1]?.event).toBe(
      NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
    );
  });

  test('appends entries delivered via subscribeToEvents', () => {
    let deliver:
      | ((event: NotificationEventName, payload: NotificationPayload) => void)
      | undefined;
    const subscribeToEvents: WebsocketDebuggerEventSubscriber = (listener) => {
      deliver = listener;
      return () => undefined;
    };

    const { result } = renderHook(() =>
      useOpenThrottleWebsocketDebugger({ subscribeToEvents }),
    );

    expect(deliver).toBeDefined();

    act(() => {
      deliver?.(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, systemAlertPayload);
    });

    expect(result.current.displayEntries).toHaveLength(1);
    expect(result.current.displayEntries[0]?.event).toBe(
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
    );
  });

  test('handleFilterChange narrows displayEntries to selected event names, dropping unknown values', () => {
    let deliver:
      | ((event: NotificationEventName, payload: NotificationPayload) => void)
      | undefined;
    const subscribeToEvents: WebsocketDebuggerEventSubscriber = (listener) => {
      deliver = listener;
      return () => undefined;
    };

    const { result } = renderHook(() =>
      useOpenThrottleWebsocketDebugger({ subscribeToEvents }),
    );

    act(() => {
      deliver?.(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, systemAlertPayload);
      deliver?.(NOTIFICATION_EVENT_NAMES.PLAN_UPDATED, planUpdatedPayload);
    });

    act(() => {
      result.current.handleFilterChange([
        NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
        'not.a.real.event',
      ]);
    });

    expect(result.current.selectedEventNames).toEqual([
      NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
    ]);
    expect(result.current.displayEntries).toHaveLength(1);
    expect(result.current.displayEntries[0]?.event).toBe(
      NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
    );
  });

  test('handleClear empties the log', () => {
    let deliver:
      | ((event: NotificationEventName, payload: NotificationPayload) => void)
      | undefined;
    const subscribeToEvents: WebsocketDebuggerEventSubscriber = (listener) => {
      deliver = listener;
      return () => undefined;
    };

    const { result } = renderHook(() =>
      useOpenThrottleWebsocketDebugger({ subscribeToEvents }),
    );

    act(() => {
      deliver?.(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, systemAlertPayload);
    });
    expect(result.current.displayEntries).toHaveLength(1);

    act(() => {
      result.current.handleClear();
    });

    expect(result.current.displayEntries).toEqual([]);
  });

  test('is filter-controlled when selectedEventNames and onSelectedEventNamesChange are both provided', () => {
    const onSelectedEventNamesChange = vi.fn();

    const { result } = renderHook(() =>
      useOpenThrottleWebsocketDebugger({
        onSelectedEventNamesChange,
        selectedEventNames: [NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT],
        subscriptionEnabled: false,
      }),
    );

    act(() => {
      result.current.handleFilterChange([
        NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      ]);
    });

    expect(onSelectedEventNamesChange).toHaveBeenCalledWith([
      NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
    ]);
    expect(result.current.selectedEventNames).toEqual([
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
    ]);
  });
});
