import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { SettingsMcpConnectionStatusBadge } from '../SettingsMcpConnectionStatusBadge';

describe('SettingsMcpConnectionStatusBadge Component', () => {
  test('renders "Connected" for an enabled connector', () => {
    const component = render(
      <SettingsMcpConnectionStatusBadge status="enabled" />,
    );

    expect(
      component.getByTestId('SettingsMcpConnectionStatusBadge'),
    ).toHaveTextContent('Connected');
  });

  test('renders "Disabled" for a disabled connector', () => {
    const component = render(
      <SettingsMcpConnectionStatusBadge status="disabled" />,
    );

    expect(
      component.getByTestId('SettingsMcpConnectionStatusBadge'),
    ).toHaveTextContent('Disabled');
  });

  test('renders "Not connected" for a disconnected connector', () => {
    const component = render(
      <SettingsMcpConnectionStatusBadge status="disconnected" />,
    );

    expect(
      component.getByTestId('SettingsMcpConnectionStatusBadge'),
    ).toHaveTextContent('Not connected');
  });

  test('forwards a custom className to the badge', () => {
    const component = render(
      <SettingsMcpConnectionStatusBadge className="ml-2" status="enabled" />,
    );

    expect(
      component.getByTestId('SettingsMcpConnectionStatusBadge'),
    ).toHaveClass('ml-2');
  });
});
