import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NotificationActions } from '../NotificationActions';
import type { NotificationActionsProps } from '../NotificationActions';

describe('NotificationActions Component', () => {
  let props: NotificationActionsProps;

  beforeEach(() => {
    props = {
      dismissAll: () => undefined,
      markAllAsRead: () => undefined,
      setOpen: () => undefined,
    };
  });

  test('exposes mark-all-read and dismiss-all actions', () => {
    const Component = () => <NotificationActions {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('NotificationActions')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mark all read' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Dismiss all' }),
    ).toBeInTheDocument();
  });
});
