import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { NotificationPermissionDenied } from '../NotificationPermissionDenied';

describe('NotificationPermissionDenied Component', () => {
  test('explains how to re-enable blocked notifications', () => {
    const Component = () => <NotificationPermissionDenied />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(
      screen.getByTestId('NotificationPermissionDenied'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Desktop notifications are blocked. You can re-enable them in your browser's site settings.",
      ),
    ).toBeInTheDocument();
  });
});
