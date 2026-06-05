import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsSocketContext } from '../NotificationsSocketContext';

describe('NotificationsSocketContext', () => {
  let component: RenderResult;

  beforeEach(() => {
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

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
