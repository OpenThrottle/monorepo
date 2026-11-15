import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { NotificationPermissionDenied } from '../NotificationPermissionDenied';

describe('NotificationPermissionDenied Component', () => {
  test('explains how to re-enable blocked notifications', () => {
    const Component = () => {
      return <NotificationPermissionDenied />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByTestId('NotificationPermissionDenied'),
    ).toBeInTheDocument();
    expect(
      component.getByText(
        "Desktop notifications are blocked. You can re-enable them in your browser's site settings.",
      ),
    ).toBeInTheDocument();
  });
});
