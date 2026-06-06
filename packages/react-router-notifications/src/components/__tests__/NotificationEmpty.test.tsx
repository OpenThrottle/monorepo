import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { NotificationEmpty } from '../NotificationEmpty';

describe('NotificationEmpty Component', () => {
  test('shows empty-state message', () => {
    const Component = () => <NotificationEmpty />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('NotificationEmpty')).toBeInTheDocument();
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });
});
