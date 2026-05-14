import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import type { NotificationInstance } from '../../types';
import { NotificationItem } from '../NotificationItem';
import type { NotificationItemProps } from '../NotificationItem';

describe('NotificationItem Component', () => {
  let props: NotificationItemProps;

  beforeEach(() => {
    const notification: NotificationInstance = {
      createdAt: new Date().toISOString(),
      dismissed: false,
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      id: 'test-id',
      payload: {
        link: '/plans/1',
        message: 'Plan updated',
        planId: 'plan-1',
        severity: 'info',
        timestamp: new Date().toISOString(),
      },
      read: false,
    };

    props = {
      notification,
      onDismiss: () => undefined,
      onDismissAndClose: () => undefined,
      onMarkRead: () => undefined,
    };

    const Component = () => (
      <DropdownMenu open={true}>
        <DropdownMenuTrigger asChild={true}>
          <button type="button">Open</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <NotificationItem {...props} />
        </DropdownMenuContent>
      </DropdownMenu>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render notification message', () => {
    expect(screen.getByTestId('notification-item-test-id')).toHaveTextContent(
      'Plan updated',
    );
  });
});
