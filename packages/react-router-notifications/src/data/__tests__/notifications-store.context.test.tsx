import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import {
  NotificationsStoreProvider,
  useNotificationsStore,
} from '../notifications-store.context';

const systemAlertPayload = {
  message: 'Test alert',
  severity: 'info' as const,
  timestamp: new Date().toISOString(),
};

function TestConsumer(): React.ReactElement {
  const store = useNotificationsStore();
  return (
    <div>
      <span data-testid="count">{store.notifications.length}</span>
      <span data-testid="visible">{store.visibleNotifications.length}</span>
      <span data-testid="unread">{store.unreadCount}</span>
      <button
        data-testid="add"
        onClick={() =>
          store.addNotification(
            NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
            systemAlertPayload,
          )
        }
        type="button"
      >
        Add
      </button>
      {store.notifications.length > 0 && (
        <>
          <button
            data-testid="mark-read"
            onClick={() => store.markAsRead(store.notifications[0].id)}
            type="button"
          >
            Mark read
          </button>
          <button
            data-testid="dismiss"
            onClick={() => store.dismiss(store.notifications[0].id)}
            type="button"
          >
            Dismiss
          </button>
        </>
      )}
      <button
        data-testid="mark-all-read"
        onClick={store.markAllAsRead}
        type="button"
      >
        Mark all read
      </button>
      <button
        data-testid="dismiss-all"
        onClick={store.dismissAll}
        type="button"
      >
        Dismiss all
      </button>
    </div>
  );
}

describe('NotificationsStoreProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('provides store with empty notifications when persist is false', () => {
    const { getByTestId } = render(
      <NotificationsStoreProvider persist={false}>
        <TestConsumer />
      </NotificationsStoreProvider>,
    );
    expect(getByTestId('count').textContent).toBe('0');
    expect(getByTestId('visible').textContent).toBe('0');
    expect(getByTestId('unread').textContent).toBe('0');
  });

  test('addNotification adds a notification and updates count and unread', async () => {
    const user = userEvent.setup();
    const { getByTestId } = render(
      <NotificationsStoreProvider persist={false}>
        <TestConsumer />
      </NotificationsStoreProvider>,
    );
    expect(getByTestId('count').textContent).toBe('0');

    await user.click(getByTestId('add'));
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('1');
    });
    expect(getByTestId('visible').textContent).toBe('1');
    expect(getByTestId('unread').textContent).toBe('1');
  });

  test('markAsRead updates unread count', async () => {
    const user = userEvent.setup();
    const { getByTestId } = render(
      <NotificationsStoreProvider persist={false}>
        <TestConsumer />
      </NotificationsStoreProvider>,
    );
    await user.click(getByTestId('add'));
    await waitFor(() => {
      expect(getByTestId('unread').textContent).toBe('1');
    });
    await user.click(getByTestId('mark-read'));
    await waitFor(() => {
      expect(getByTestId('unread').textContent).toBe('0');
    });
  });

  test('dismiss removes from visibleNotifications', async () => {
    const user = userEvent.setup();
    const { getByTestId } = render(
      <NotificationsStoreProvider persist={false}>
        <TestConsumer />
      </NotificationsStoreProvider>,
    );
    await user.click(getByTestId('add'));
    await waitFor(() => {
      expect(getByTestId('visible').textContent).toBe('1');
    });
    await user.click(getByTestId('dismiss'));
    await waitFor(() => {
      expect(getByTestId('visible').textContent).toBe('0');
    });
    expect(getByTestId('count').textContent).toBe('1');
  });

  test('dismissAll clears visible notifications', async () => {
    const user = userEvent.setup();
    const { getByTestId } = render(
      <NotificationsStoreProvider persist={false}>
        <TestConsumer />
      </NotificationsStoreProvider>,
    );
    await user.click(getByTestId('add'));
    await user.click(getByTestId('add'));
    await waitFor(() => {
      expect(getByTestId('visible').textContent).toBe('2');
    });
    await user.click(getByTestId('dismiss-all'));
    await waitFor(() => {
      expect(getByTestId('visible').textContent).toBe('0');
    });
  });
});
