/* eslint-disable react/no-multi-comp -- test-local store probes and route wrappers */
import { render, waitFor } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { DEFAULT_NOTIFICATIONS_STORAGE_KEY } from '../../data';
import { useNotificationsStore } from '../../hooks/useNotificationsStore';
import type { NotificationsStoreProviderProps } from '../NotificationsStoreProvider';
import { NotificationsStoreProvider } from '../NotificationsStoreProvider';

const STORED_NOTIFICATION = {
  createdAt: '2026-01-01T00:00:00.000Z',
  dismissed: false,
  event: 'plan.completed',
  id: 'stored-1',
  payload: { message: 'Plan finished', severity: 'success' },
  read: false,
};

const UnreadProbe = (props: {
  readonly renders: number[];
}): React.ReactElement => {
  const { renders } = props;

  // Hooks
  const { unreadCount } = useNotificationsStore();

  renders.push(unreadCount);

  return <span data-testid="unread-count">{unreadCount}</span>;
};

describe('NotificationsStoreProvider Component', () => {
  let props: NotificationsStoreProviderProps;

  beforeEach(() => {
    window.localStorage.clear();
    props = { children: null };
  });

  test('renders only the visually-hidden announcer when children is null', () => {
    const Component = () => <NotificationsStoreProvider {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { container, getByTestId } = render(<RoutesStub />);

    const announcer = getByTestId('notifications-announcer');
    expect(announcer).toHaveClass('sr-only');
    expect(announcer).toBeEmptyDOMElement();
    expect(container.firstChild).toBe(announcer);
  });

  // The first client render must match the server-rendered HTML, so persisted
  // notifications are restored in a mount effect rather than read during render.
  // Reading them during render is what produced the notification-bell-badge
  // hydration mismatch.
  test('renders no unread notifications on the first render, then restores them', async () => {
    window.localStorage.setItem(
      DEFAULT_NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify([STORED_NOTIFICATION]),
    );
    const renders: number[] = [];

    const Component = () => (
      <NotificationsStoreProvider>
        <UnreadProbe renders={renders} />
      </NotificationsStoreProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    await waitFor(() => {
      expect(component.getByTestId('unread-count')).toHaveTextContent('1');
    });

    // The load-bearing assertion: the very first render saw zero unread, the
    // same as the server would render with no localStorage. Restoring during
    // render instead would make this 1 and diverge from the SSR markup.
    expect(renders[0]).toBe(0);
  });

  test('does not clobber persisted notifications before restoring them', async () => {
    window.localStorage.setItem(
      DEFAULT_NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify([STORED_NOTIFICATION]),
    );

    const Component = () => (
      <NotificationsStoreProvider>
        <UnreadProbe renders={[]} />
      </NotificationsStoreProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    await waitFor(() => {
      expect(component.getByTestId('unread-count')).toHaveTextContent('1');
    });

    const persisted: unknown = JSON.parse(
      window.localStorage.getItem(DEFAULT_NOTIFICATIONS_STORAGE_KEY) ?? '[]',
    );
    expect(Array.isArray(persisted) ? persisted : []).toHaveLength(1);
  });
});
