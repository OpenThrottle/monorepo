import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationsStoreProvider } from '@openthrottle/react-router-notifications';
import { NotificationsSubscriptionBridge } from '../NotificationsSubscriptionBridge';
import type { NotificationsSubscriptionBridgeProps } from '../NotificationsSubscriptionBridge';

describe('NotificationsSubscriptionBridge Component', () => {
  let component: RenderResult;
  let props: NotificationsSubscriptionBridgeProps;

  beforeEach(() => {
    props = {
      children: <div data-testid="bridge-child">Child content</div>,
    };

    const Component = () => (
      <NotificationsStoreProvider persist={false}>
        <NotificationsSubscriptionBridge {...props} />
      </NotificationsStoreProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    component = render(<RoutesStub />);
  });

  test('renders its children (graphql-ws client stubbed to null suite-wide)', () => {
    expect(component.getByTestId('bridge-child')).toBeInTheDocument();
    expect(component.getByText('Child content')).toBeInTheDocument();
  });
});
