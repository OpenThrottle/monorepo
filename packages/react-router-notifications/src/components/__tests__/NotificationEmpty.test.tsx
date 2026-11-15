import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { NotificationEmpty } from '../NotificationEmpty';

describe('NotificationEmpty Component', () => {
  test('shows empty-state message', () => {
    const Component = () => {
      return <NotificationEmpty />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('NotificationEmpty')).toBeInTheDocument();
    expect(component.getByText('No notifications')).toBeInTheDocument();
  });
});
