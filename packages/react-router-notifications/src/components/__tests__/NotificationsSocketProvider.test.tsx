import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsSocketProvider } from '../NotificationsSocketProvider';
import type { NotificationsSocketProviderProps } from '../NotificationsSocketProvider';

describe('NotificationsSocketProvider Component', () => {
  let component: RenderResult;
  let props: NotificationsSocketProviderProps;

  beforeEach(() => {
    props = { children: null, webSocketUrl: 'ws://localhost' };

    const Component = () => <NotificationsSocketProvider {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
