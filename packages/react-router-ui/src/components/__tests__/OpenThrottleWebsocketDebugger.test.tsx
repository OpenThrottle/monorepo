import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import type { NotificationEventName } from '@openthrottle/openthrottle-notifications';
import {
  NOTIFICATION_EVENT_NAMES,
  type NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { OpenThrottleWebsocketDebugger } from '../OpenThrottleWebsocketDebugger';
import type { OpenThrottleWebsocketDebuggerProps } from '../OpenThrottleWebsocketDebugger';
import type { WebsocketDebuggerLogEntry } from '../websocket-debugger';

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

const mockEntries: readonly WebsocketDebuggerLogEntry[] = [
  {
    event: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
    id: 'entry-1',
    payload: systemAlertPayload,
    receivedAt: '2026-05-29T12:00:00.000Z',
  },
  {
    event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
    id: 'entry-2',
    payload: planUpdatedPayload,
    receivedAt: '2026-05-29T12:00:01.000Z',
  },
];

describe('OpenThrottleWebsocketDebugger Component', () => {
  let props: OpenThrottleWebsocketDebuggerProps;

  beforeEach(() => {
    props = {
      connectionStatus: 'connected',
      initialEntries: mockEntries,
      subscriptionEnabled: false,
    };
  });

  const renderDebugger = (
    override: Partial<OpenThrottleWebsocketDebuggerProps> = {},
  ) => {
    const Component = () => (
      <OpenThrottleWebsocketDebugger {...props} {...override} />
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub />);
  };

  const getLogRegion = () =>
    within(screen.getByTestId('OpenThrottleWebsocketDebugger-log'));

  test('renders connection status and log entries from initialEntries', () => {
    renderDebugger();

    expect(
      screen.getByTestId('OpenThrottleWebsocketDebugger'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('OpenThrottleWebsocketDebugger-status'),
    ).toHaveTextContent('connected');

    const log = getLogRegion();

    expect(log.getByText(/test alert/i)).toBeInTheDocument();
    expect(log.getByText(/"planId": "plan-1"/)).toBeInTheDocument();
  });

  test('hides all entries when filter selection is empty', async () => {
    const user = userEvent.setup();

    const ControlledFilter = () => {
      const [selectedEventNames, setSelectedEventNames] = React.useState<
        readonly NotificationEventName[]
      >([]);

      return (
        <OpenThrottleWebsocketDebugger
          connectionStatus="connected"
          initialEntries={mockEntries}
          onSelectedEventNamesChange={setSelectedEventNames}
          selectedEventNames={selectedEventNames}
          subscriptionEnabled={false}
        />
      );
    };

    const RoutesStub = createRoutesStub([
      { Component: ControlledFilter, path: '/' },
    ]);
    render(<RoutesStub />);

    const log = getLogRegion();

    expect(log.getByText(/no events yet/i)).toBeInTheDocument();
    expect(log.queryByText(/test alert/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /filter events/i }));

    const planOption = screen.getByRole('option', { name: 'Plan updated' });
    await user.click(planOption);

    expect(log.getByText(/"planId": "plan-1"/)).toBeInTheDocument();
    expect(log.queryByText(/test alert/i)).not.toBeInTheDocument();
  });

  test('clear button removes entries from the feed', async () => {
    const user = userEvent.setup();
    renderDebugger();

    const log = getLogRegion();

    expect(log.getByText(/test alert/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(log.getByText(/no events yet/i)).toBeInTheDocument();
    expect(log.queryByText(/test alert/i)).not.toBeInTheDocument();
  });
});
