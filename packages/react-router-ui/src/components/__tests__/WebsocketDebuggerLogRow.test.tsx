import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
  NOTIFICATION_EVENT_NAMES,
  type NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { WebsocketDebuggerLogRow } from '../WebsocketDebuggerLogRow';
import type { WebsocketDebuggerLogEntry } from '../websocket-debugger';

const planUpdatedPayload = {
  message: 'Plan updated',
  planId: 'plan-1',
  severity: 'info',
  timestamp: '2026-05-29T12:00:01.000Z',
} satisfies NotificationPayload;

describe('WebsocketDebuggerLogRow Component', () => {
  test('renders the known event label, raw event name, and formatted payload', () => {
    const entry: WebsocketDebuggerLogEntry = {
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      id: 'entry-1',
      payload: planUpdatedPayload,
      receivedAt: '2026-05-29T12:00:01.000Z',
    };

    render(<WebsocketDebuggerLogRow entry={entry} />);

    const article = screen.getByTestId(
      'OpenThrottleWebsocketDebugger-entry-entry-1',
    );
    expect(article).toBeVisible();
    expect(screen.getByText('Plan updated')).toBeVisible();
    expect(
      screen.getByText(NOTIFICATION_EVENT_NAMES.PLAN_UPDATED),
    ).toBeVisible();
    expect(article.textContent).toContain('"planId": "plan-1"');
  });

  test('renders a distinct testid per entry id', () => {
    const entry: WebsocketDebuggerLogEntry = {
      event: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      id: 'entry-2',
      payload: {
        message: 'System degraded',
        severity: 'warning',
        timestamp: '2026-05-29T12:00:02.000Z',
      },
      receivedAt: '2026-05-29T12:00:02.000Z',
    };

    render(<WebsocketDebuggerLogRow entry={entry} />);

    expect(
      screen.getByTestId('OpenThrottleWebsocketDebugger-entry-entry-2'),
    ).toBeVisible();
    expect(screen.getByText('System alerts')).toBeVisible();
  });
});
