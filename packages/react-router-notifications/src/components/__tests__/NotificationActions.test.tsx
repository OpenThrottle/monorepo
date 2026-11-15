import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { NotificationActionsProps } from '../NotificationActions';
import { NotificationActions } from '../NotificationActions';

describe('NotificationActions Component', () => {
  let props: NotificationActionsProps;

  beforeEach(() => {
    props = {
      dismissAll: () => undefined,
      hasAny: false,
      markAllAsRead: () => undefined,
      setOpen: () => undefined,
    };
  });

  test('exposes mark-all-read and dismiss-all actions', () => {
    const Component = () => {
      return <NotificationActions {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('NotificationActions')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Mark all read' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Dismiss all' }),
    ).toBeInTheDocument();
  });
});
