import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import * as RouteModule from '../auth.logout';

describe('routes/auth.logout.tsx', () => {
  test('renders logo before sign-in form is unlocked', () => {
    const RoutesStub = createRoutesStub([
      // createRoutesStub route component typing differs from generated route module types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- stub route component
      { Component: RouteModule.default as any, path: '/' },
    ]);
    render(<RoutesStub />);

    expect(screen.getByTestId('OpenThrottleLogo')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(
      screen.queryByTestId('OpenThrottleAuthForm'),
    ).not.toBeInTheDocument();
  });

  test('reveals sign-in form after five clicks on the screen', async () => {
    const user = userEvent.setup();
    const RoutesStub = createRoutesStub([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- stub route component
      { Component: RouteModule.default as any, path: '/' },
    ]);
    render(<RoutesStub />);

    const logo = screen.getByTestId('OpenThrottleLogo');
    await user.click(logo);
    await user.click(logo);
    await user.click(logo);
    await user.click(logo);
    await user.click(logo);

    expect(screen.getByTestId('OpenThrottleAuthForm')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
