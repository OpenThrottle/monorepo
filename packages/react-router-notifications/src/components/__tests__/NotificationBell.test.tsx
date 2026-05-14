import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsStoreProvider } from '../NotificationsStoreProvider';
import { NotificationBell } from '../NotificationBell';

describe('NotificationBell Component', () => {
  beforeEach(() => {
    const Component = () => (
      <NotificationsStoreProvider persist={false}>
        <NotificationBell />
      </NotificationsStoreProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render notification trigger', () => {
    expect(screen.getByTestId('notification-bell-trigger')).toBeInTheDocument();
  });
});
