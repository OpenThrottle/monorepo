import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { NOTIFICATIONS_DEDUP_WINDOW_MS } from '../../config/index';
import { NotificationsStoreProvider } from '../../components/NotificationsStoreProvider';
import { useNotificationsStore } from '../../hooks/useNotificationsStore';
import { reducer } from '../notifications-store.context';
import type { NotificationInstance } from '../../types';

const systemAlertPayload = {
  message: 'Test alert',
  severity: 'info' as const,
  timestamp: new Date().toISOString(),
};

const otherAlertPayload = {
  message: 'Different alert',
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
      <button
        data-testid="add-other"
        onClick={() =>
          store.addNotification(
            NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
            otherAlertPayload,
          )
        }
        type="button"
      >
        Add other
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
    await user.click(getByTestId('add-other'));
    await waitFor(() => {
      expect(getByTestId('visible').textContent).toBe('2');
    });
    await user.click(getByTestId('dismiss-all'));
    await waitFor(() => {
      expect(getByTestId('visible').textContent).toBe('0');
    });
  });

  test('coalesces an identical re-emit but keeps distinct content', async () => {
    const user = userEvent.setup();
    const { getByTestId } = render(
      <NotificationsStoreProvider persist={false}>
        <TestConsumer />
      </NotificationsStoreProvider>,
    );

    // Two identical adds within the dedup window collapse to one entry.
    await user.click(getByTestId('add'));
    await user.click(getByTestId('add'));
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('1');
    });

    // A different message still adds a new entry.
    await user.click(getByTestId('add-other'));
    await waitFor(() => {
      expect(getByTestId('count').textContent).toBe('2');
    });
  });
});

describe('reducer add coalescing', () => {
  const basePayload = {
    message: 'Replayed alert',
    severity: 'info' as const,
    timestamp: '2026-06-26T00:00:00.000Z',
  };

  function addAction() {
    return {
      event: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      payload: basePayload,
      type: 'add' as const,
    };
  }

  test('drops an identical re-emit while the newest entry is inside the window', () => {
    const first = reducer([], addAction());
    expect(first).toHaveLength(1);

    const second = reducer(first, addAction());
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(first[0].id);
  });

  test('adds again once the newest matching entry is older than the window', () => {
    const stale: NotificationInstance = {
      createdAt: new Date(
        Date.now() - (NOTIFICATIONS_DEDUP_WINDOW_MS + 1000),
      ).toISOString(),
      dismissed: false,
      event: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      id: 'stale-id',
      payload: basePayload,
      read: false,
    };

    const next = reducer([stale], addAction());
    expect(next).toHaveLength(2);
    expect(next[0].id).not.toBe('stale-id');
  });

  test('does not coalesce when the link differs', () => {
    const withLink = reducer([], {
      event: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      payload: { ...basePayload, link: '/a' },
      type: 'add' as const,
    });

    const next = reducer(withLink, {
      event: NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT,
      payload: { ...basePayload, link: '/b' },
      type: 'add' as const,
    });

    expect(next).toHaveLength(2);
  });
});
