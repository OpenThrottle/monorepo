import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsSocketProvider } from '../NotificationsSocketProvider';
import { NotificationStatusBadge } from '../NotificationStatusBadge';

describe('NotificationStatusBadge Component', () => {
  beforeEach(() => {
    const Component = () => (
      <NotificationsSocketProvider webSocketUrl="">
        <NotificationStatusBadge />
      </NotificationsSocketProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render socket status', () => {
    expect(
      screen.getByTestId('notifications-socket-status'),
    ).toBeInTheDocument();
  });
});
