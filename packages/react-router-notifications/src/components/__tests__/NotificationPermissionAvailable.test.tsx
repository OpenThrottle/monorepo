import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { NotificationPermissionAvailable } from '../NotificationPermissionAvailable';

describe('NotificationPermissionAvailable Component', () => {
  test('renders available-permission placeholder', () => {
    const Component = () => {
      return <NotificationPermissionAvailable />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(
      component.getByTestId('NotificationPermissionAvailable'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('heading', {
        name: 'NotificationPermissionAvailable',
      }),
    ).toBeInTheDocument();
  });
});
