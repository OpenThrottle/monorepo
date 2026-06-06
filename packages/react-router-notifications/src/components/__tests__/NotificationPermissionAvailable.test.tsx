import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { NotificationPermissionAvailable } from '../NotificationPermissionAvailable';

describe('NotificationPermissionAvailable Component', () => {
  test('renders available-permission placeholder', () => {
    const Component = () => <NotificationPermissionAvailable />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(
      screen.getByTestId('NotificationPermissionAvailable'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'NotificationPermissionAvailable' }),
    ).toBeInTheDocument();
  });
});
