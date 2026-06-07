import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { NotificationsSocketContext } from '../NotificationsSocketContext';

describe('NotificationsSocketContext', () => {
  test('provides context value to children', () => {
    const Component = () => (
      <NotificationsSocketContext.Provider
        value={{
          socket: null,
          status: 'disconnected',
          subscribeToNotifications: () => () => {},
        }}
      >
        <span data-testid="ctx-child">child</span>
      </NotificationsSocketContext.Provider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('ctx-child')).toHaveTextContent('child');
  });
});
