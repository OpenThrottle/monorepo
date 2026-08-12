import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { createLoaderArgs } from '@openthrottle/react-router-testing';
import * as RouteModule from '../_index';

type LoaderArgs = Parameters<typeof RouteModule.loader>[0];

// The auth screen's GradientMesh background renders a WebGL shader via
// @paper-design/shaders-react; jsdom has no GL context, which makes the real
// shader throw an unhandled async rejection after mount. Stub GradientMesh
// itself (mocking the shader package directly does not intercept it once it
// is imported transitively through this barrel) with a harmless placeholder.
vi.mock('@openthrottle/react-router-ui-global', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@openthrottle/react-router-ui-global')
    >();
  return {
    ...actual,
    GradientMesh: () => <div data-testid="mesh-gradient" />,
  };
});

describe('routes/_index.tsx', () => {
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
  });

  test('loader returns an empty object', async () => {
    const loaded = await RouteModule.loader(
      createLoaderArgs<LoaderArgs>({ url: 'http://localhost/' }),
    );
    expect(loaded).toEqual({});
  });
});
