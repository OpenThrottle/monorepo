import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  NOTIFICATION_EVENT_NAMES,
  type NotificationPayload,
} from '@openthrottle/openthrottle-notifications';
import { NotificationsStoreProvider } from '../NotificationsStoreProvider';
import { useNotificationsStore } from '../../hooks/useNotificationsStore';

function TestConsumer(props: {
  readonly payload: NotificationPayload;
}): React.ReactElement {
  const { payload } = props;
  const store = useNotificationsStore();

  return (
    <button
      data-testid="add"
      onClick={() =>
        store.addNotification(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, payload)
      }
      type="button"
    >
      Add
    </button>
  );
}

describe('NotificationsAnnouncer (via NotificationsStoreProvider)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('renders an empty polite live region before any notification', () => {
    const { getByTestId } = render(
      <NotificationsStoreProvider persist={false}>
        <span />
      </NotificationsStoreProvider>,
    );

    const region = getByTestId('notifications-announcer');
    expect(region).toHaveTextContent('');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('role', 'status');
  });

  test('announces the latest message politely when a notification is added', async () => {
    const user = userEvent.setup();
    const payload: NotificationPayload = {
      message: 'Plan finished running',
      severity: 'success',
      timestamp: new Date().toISOString(),
    };

    const { getByTestId } = render(
      <NotificationsStoreProvider persist={false}>
        <TestConsumer payload={payload} />
      </NotificationsStoreProvider>,
    );

    await user.click(getByTestId('add'));

    await waitFor(() => {
      expect(getByTestId('notifications-announcer')).toHaveTextContent(
        'Plan finished running',
      );
    });
    expect(getByTestId('notifications-announcer')).toHaveAttribute(
      'aria-live',
      'polite',
    );
  });

  test('escalates to assertive/alert for error severity', async () => {
    const user = userEvent.setup();
    const payload: NotificationPayload = {
      message: 'Plan failed',
      severity: 'error',
      timestamp: new Date().toISOString(),
    };

    const { getByTestId } = render(
      <NotificationsStoreProvider persist={false}>
        <TestConsumer payload={payload} />
      </NotificationsStoreProvider>,
    );

    await user.click(getByTestId('add'));

    await waitFor(() => {
      expect(getByTestId('notifications-announcer')).toHaveTextContent(
        'Plan failed',
      );
    });
    const region = getByTestId('notifications-announcer');
    expect(region).toHaveAttribute('aria-live', 'assertive');
    expect(region).toHaveAttribute('role', 'alert');
  });
});
