import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import * as RouteModule from '../auth._index';

describe('routes/auth._index.tsx', () => {
  test('renders the logo and sign-in form unconditionally', () => {
    const RoutesStub = createRoutesStub([
      { Component: RouteModule.default, path: '/' },
    ]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('OpenThrottleLogo')).toBeInTheDocument();
    expect(component.getByText('Admin')).toBeInTheDocument();
    expect(component.getByTestId('OpenThrottleAuthForm')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Sign in' }),
    ).toBeInTheDocument();
    expect(component.getByLabelText('Email')).toBeInTheDocument();
  });
});
