import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationActions } from '../NotificationActions';
import type { NotificationActionsProps } from '../NotificationActions';

describe('NotificationActions Component', () => {
  let component: RenderResult;
  let props: NotificationActionsProps;

  beforeEach(() => {
    props = {
      dismissAll: () => undefined,
      markAllAsRead: () => undefined,
      setOpen: () => undefined,
    };

    const Component = () => <NotificationActions {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
