import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test } from 'vitest';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import { NotificationsStoreProvider } from '../NotificationsStoreProvider';
import { NotificationBell } from '../NotificationBell';
import { useNotificationsStore } from '../../hooks/useNotificationsStore';

// Single harness component (satisfies react/no-multi-comp): an add button that
// drives a payload through the real store the same way the subscription bridge
// does — via addNotification — so the reducer guard is exercised end-to-end
// rather than mocked. The bell renders alongside it. Payloads carry no `link`,
// so NotificationItem renders no <Link> and no router context is needed.
function BellHarness(props: { readonly message: string }): React.ReactElement {
  const { addNotification } = useNotificationsStore();
  return (
    <>
      <button
        data-testid="add-notification"
        onClick={() =>
          addNotification(NOTIFICATION_EVENT_NAMES.SYSTEM_ALERT, {
            message: props.message,
            severity: 'info',
            timestamp: new Date().toISOString(),
          })
        }
        type="button"
      >
        Add
      </button>
      <NotificationBell />
    </>
  );
}

function renderBell(message: string) {
  return render(
    <NotificationsStoreProvider persist={false}>
      <BellHarness message={message} />
    </NotificationsStoreProvider>,
  );
}

describe('NotificationBell Component', () => {
  test('should render notification trigger', () => {
    const component = renderBell('Anything');
    expect(
      component.getByTestId('notification-bell-trigger'),
    ).toBeInTheDocument();
  });

  test('a whitespace-only message adds no badge and no row (phantom guard)', async () => {
    const user = userEvent.setup();
    const component = renderBell('   ');

    await user.click(component.getByTestId('add-notification'));

    // No unread-badge increment: the phantom entry never entered the store.
    expect(component.queryByTestId('notification-bell-badge')).toBeNull();

    // Open the dropdown: no notification row should render (empty state instead).
    await user.click(component.getByTestId('notification-bell-trigger'));
    expect(component.queryAllByTestId(/^notification-item-/)).toHaveLength(0);
  });

  test('a genuine message still surfaces a badge and a row (positive control)', async () => {
    const user = userEvent.setup();
    const component = renderBell('Real alert');

    await user.click(component.getByTestId('add-notification'));

    const badge = component.getByTestId('notification-bell-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toBe('1');

    await user.click(component.getByTestId('notification-bell-trigger'));
    expect(
      component.queryAllByTestId(/^notification-item-/).length,
    ).toBeGreaterThan(0);
  });
});
