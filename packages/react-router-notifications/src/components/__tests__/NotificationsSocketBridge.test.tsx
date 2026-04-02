import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsStoreProvider } from '../../data/notifications-store.context';
import { NotificationsSocketBridge } from '../NotificationsSocketBridge';
import type { NotificationsSocketBridgeProps } from '../NotificationsSocketBridge';

describe('NotificationsSocketBridge Component', () => {
  let component: RenderResult;
  let props: NotificationsSocketBridgeProps;

  beforeEach(() => {
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
});
