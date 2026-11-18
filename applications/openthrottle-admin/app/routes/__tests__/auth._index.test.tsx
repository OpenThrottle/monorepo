import { AUTH_COOKIE_NAME } from '@openthrottle/react-router-auth';
import { createTestRouterContext } from '@openthrottle/react-router-testing';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { Route } from '@/app/routes/+types/auth._index';

import * as RouteModule from '../auth._index';

const loaderArgs = (path: string, cookie = ''): Route.LoaderArgs => {
  const request = new Request(`http://localhost${path}`, {
    headers: cookie === '' ? {} : { cookie },
  });

  return {
    context: createTestRouterContext(),
    params: {},
    pattern: '/auth',
    request,
    url: new URL(request.url),
  };
};

const readLocation = (value: unknown): string | null => {
  return value instanceof Response ? value.headers.get('Location') : null;
};

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

  test('posts the safe redirectUrl it arrived with', () => {
    const RoutesStub = createRoutesStub([
      { Component: RouteModule.default, path: '/auth' },
    ]);
    const component = render(
      <RoutesStub initialEntries={['/auth?redirectUrl=%2Fusers%2Fabc']} />,
    );
    const input = component
      .getByTestId('OpenThrottleAuthForm')
      .querySelector('input[name="redirectUrl"]');

    expect(input).toHaveAttribute('value', '/users/abc');
  });

  test('posts /dashboard for an unsafe redirectUrl', () => {
    const RoutesStub = createRoutesStub([
      { Component: RouteModule.default, path: '/auth' },
    ]);
    const component = render(
      <RoutesStub initialEntries={['/auth?redirectUrl=%2F%2Fevil.test']} />,
    );
    const input = component
      .getByTestId('OpenThrottleAuthForm')
      .querySelector('input[name="redirectUrl"]');

    expect(input).toHaveAttribute('value', '/dashboard');
  });

  describe('loader', () => {
    test('renders the form with no auth cookie', async () => {
      await expect(RouteModule.loader(loaderArgs('/auth?redirectUrl=%2Fusers'))).resolves.toEqual({}); // prettier-ignore
    });

    test('sends an authed visitor to the safe redirectUrl', async () => {
      const result = await RouteModule.loader(loaderArgs('/auth?redirectUrl=%2Fusers%2Fabc', `${AUTH_COOKIE_NAME}=t`)); // prettier-ignore

      expect(readLocation(result)).toBe('/users/abc');
    });

    test('falls back to /dashboard for an unsafe redirectUrl', async () => {
      const result = await RouteModule.loader(loaderArgs('/auth?redirectUrl=%2F%2Fevil.test', `${AUTH_COOKIE_NAME}=t`)); // prettier-ignore

      expect(readLocation(result)).toBe('/dashboard');
    });
  });
});
