import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NotificationsStoreProvider } from '../../data/notifications-store.context';
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
  let component: RenderResult;
  let props: NotificationsSocketBridgeProps;

  beforeEach(() => {
    vi.mocked(getSystemNotificationsPreference).mockClear();

    props = {
      children: null,
      webSocketUrl: 'http://localhost:0',
    };

    const Component = () => (
      <NotificationsStoreProvider persist={false}>
        <NotificationsSocketBridge {...props} />
      </NotificationsStoreProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });

  test('hydrates system notification preference once on mount', () => {
    expect(getSystemNotificationsPreference).toHaveBeenCalledTimes(1);
  });
});
