import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsSocketProvider } from '../NotificationsSocketProvider';
import type { NotificationsSocketProviderProps } from '../NotificationsSocketProvider';

describe('NotificationsSocketProvider Component', () => {
  let props: NotificationsSocketProviderProps;

  beforeEach(() => {
    props = { children: null, webSocketUrl: 'ws://localhost' };
  });

  test('renders without visible UI when children is null', () => {
    const Component = () => <NotificationsSocketProvider {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { container } = render(<RoutesStub />);

    expect(container).toBeEmptyDOMElement();
  });
});
