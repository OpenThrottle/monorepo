import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { NotificationPermissionUnsupported } from '../NotificationPermissionUnsupported';

describe('NotificationPermissionUnsupported Component', () => {
  test('explains HTTPS and browser requirements', () => {
    const Component = () => <NotificationPermissionUnsupported />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(
      screen.getByTestId('NotificationPermissionUnsupported'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Desktop notifications require HTTPS or a supported browser.',
      ),
    ).toBeInTheDocument();
  });
});
