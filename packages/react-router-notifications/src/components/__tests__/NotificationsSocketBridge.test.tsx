import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NotificationsStoreProvider } from '../NotificationsStoreProvider';
import { getSystemNotificationsPreference } from '../../utils/system-notification';
import { NotificationsSocketBridge } from '../NotificationsSocketBridge';
import type { NotificationsSocketBridgeProps } from '../NotificationsSocketBridge';

vi.mock('../../utils/system-notification', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../utils/system-notification')>();
  return {
    ...actual,
    getSystemNotificationsPreference: vi.fn(() => ({ enabled: false })),
  };
});

describe('NotificationsSocketBridge Component', () => {
  let props: NotificationsSocketBridgeProps;

  beforeEach(() => {
    vi.mocked(getSystemNotificationsPreference).mockClear();

    props = {
      children: null,
      webSocketUrl: 'http://localhost:0',
    };
  });

  test('renders only the visually-hidden announcer when children is null', () => {
    const Component = () => (
      <NotificationsStoreProvider persist={false}>
        <NotificationsSocketBridge {...props} />
      </NotificationsStoreProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { container, getByTestId } = render(<RoutesStub />);

    const announcer = getByTestId('notifications-announcer');
    expect(announcer).toHaveClass('sr-only');
    expect(announcer).toBeEmptyDOMElement();
    expect(container.firstChild).toBe(announcer);
  });

  test('hydrates system notification preference once on mount', () => {
    const Component = () => (
      <NotificationsStoreProvider persist={false}>
        <NotificationsSocketBridge {...props} />
      </NotificationsStoreProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(getSystemNotificationsPreference).toHaveBeenCalledTimes(1);
  });
});
