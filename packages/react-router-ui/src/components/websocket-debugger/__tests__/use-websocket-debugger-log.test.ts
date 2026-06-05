import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  NOTIFICATION_EVENT_NAMES,
  type NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import {
  filterWebsocketDebuggerEntries,
  useWebsocketDebuggerLog,
} from '../use-websocket-debugger-log';
import type { WebsocketDebuggerLogEntry } from '../types';

const systemAlertPayload = {
  message: 'Test alert',
  severity: 'info',
  timestamp: '2026-05-29T12:00:00.000Z',
} satisfies NotificationPayload;

const planUpdatedPayload = {
  message: 'Plan updated',
  planId: 'plan-1',
  severity: 'info',
  timestamp: '2026-05-29T12:00:01.000Z',
} satisfies NotificationPayload;

describe('filterWebsocketDebuggerEntries', () => {
  const entries: readonly WebsocketDebuggerLogEntry[] = [
    {
      event: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      id: '1',
      payload: systemAlertPayload,
      receivedAt: '2026-05-29T12:00:00.000Z',
    },
    {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      id: '2',
      payload: planUpdatedPayload,
      receivedAt: '2026-05-29T12:00:01.000Z',
    },
  ];

  test('returns no entries when selection is empty', () => {
    expect(filterWebsocketDebuggerEntries(entries, [])).toEqual([]);
  });

  test('returns only entries matching selected event names', () => {
    expect(
      filterWebsocketDebuggerEntries(entries, [
        NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      ]),
    ).toEqual([entries[1]]);
  });
});

describe('useWebsocketDebuggerLog', () => {
  test('appends entries with newest first and respects cap', () => {
    const { result } = renderHook(() => useWebsocketDebuggerLog({ cap: 2 }));

    act(() => {
      result.current.append(
        NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
        systemAlertPayload,
      );
      result.current.append(
        NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
        planUpdatedPayload,
      );
      result.current.append(
        NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
        systemAlertPayload,
      );
    });

    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0]?.event).toBe(
      NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
    );
    expect(result.current.entries[1]?.event).toBe(
      NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
    );
  });

  test('clear removes all entries', () => {
    const { result } = renderHook(() => useWebsocketDebuggerLog());

    act(() => {
      result.current.append(
        NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
        systemAlertPayload,
      );
      result.current.clear();
    });

    expect(result.current.entries).toEqual([]);
    expect(result.current.filteredEntries).toEqual([]);
  });

  test('filteredEntries shows none when no events are selected', () => {
    const { result } = renderHook(() => useWebsocketDebuggerLog());

    act(() => {
      result.current.append(
        NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
        systemAlertPayload,
      );
      result.current.setSelectedEventNames([]);
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.filteredEntries).toEqual([]);
  });

  test('filteredEntries respects multiselect filter', () => {
    const { result } = renderHook(() => useWebsocketDebuggerLog());

    act(() => {
      result.current.append(
        NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
        systemAlertPayload,
      );
      result.current.append(
        NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
        planUpdatedPayload,
      );
      result.current.setSelectedEventNames([
        NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      ]);
    });

    expect(result.current.filteredEntries).toHaveLength(1);
    expect(result.current.filteredEntries[0]?.event).toBe(
      NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
    );
  });
});
