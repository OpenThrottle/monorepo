import * as React from 'react';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useNotificationsSocket } from '@openthrottle/react-router-notifications';
import { SettingsWebsocketDebugger } from '../SettingsWebsocketDebugger';
import { SETTINGS_WEBSOCKET_DEBUGGER_FRAGMENT_ID } from '../SettingsWebsocketDebugger';
import { renderRoutesStub } from '~/testing/route-fixtures';

vi.mock('@openthrottle/react-router-notifications', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/react-router-notifications')
    >();

  return {
    ...actual,
    useNotificationsSocket: vi.fn(),
  };
});

describe('SettingsWebsocketDebugger', () => {
  beforeEach(() => {
    vi.mocked(useNotificationsSocket).mockReturnValue({
      socket: null,
      status: 'connected',
      subscribeToNotifications: () => () => undefined,
    });
  });

  test('renders live feed fieldset wired to notifications socket context', () => {
    renderRoutesStub(<SettingsWebsocketDebugger />);

    expect(
      document.getElementById(SETTINGS_WEBSOCKET_DEBUGGER_FRAGMENT_ID),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('OpenThrottleWebsocketDebugger'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('OpenThrottleWebsocketDebugger-status'),
    ).toHaveTextContent('connected');
  });
});
