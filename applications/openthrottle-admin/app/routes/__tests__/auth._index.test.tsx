import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import * as RouteModule from '../auth._index';

describe('routes/auth._index.tsx', () => {
  test('renders the logo and sign-in form unconditionally', () => {
    const RoutesStub = createRoutesStub([
      // createRoutesStub route component typing differs from generated route module types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- stub route component
      { Component: RouteModule.default as any, path: '/' },
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
