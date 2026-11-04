import { NOTIFICATION_EVENT_NAMES } from '@openthrottle/openthrottle-notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@openthrottle/react-router-shadcn';
import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { NotificationInstance } from '../../types';
import type { NotificationItemProps } from '../NotificationItem';
import { NotificationItem } from '../NotificationItem';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

describe('NotificationItem Component', () => {
  let props: NotificationItemProps;

  beforeEach(() => {
    const notification: NotificationInstance = {
      createdAt: FIXED_NOW.toISOString(),
      dismissed: false,
      event: NOTIFICATION_EVENT_NAMES.PLAN_UPDATED,
      id: 'test-id',
      payload: {
        link: '/plans/1',
        message: 'Plan updated',
        planId: 'plan-1',
        severity: 'info',
        timestamp: FIXED_NOW.toISOString(),
      },
      read: false,
    };

    props = {
      notification,
      onDismiss: () => undefined,
      onDismissAndClose: () => undefined,
      onMarkRead: () => undefined,
    };

    const Component = () => {
      return (
        <DropdownMenu open={true}>
          <DropdownMenuTrigger asChild={true}>
            <button type="button">Open</button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <NotificationItem {...props} />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);
  });

  test('should render notification message', () => {
    expect(screen.getByTestId('notification-item-test-id')).toHaveTextContent(
      'Plan updated',
    );
  });
});
