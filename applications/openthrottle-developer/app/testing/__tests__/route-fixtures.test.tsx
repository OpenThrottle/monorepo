import * as React from 'react';
import { describe, expect, test } from 'vitest';

import {
  renderRouteHarness,
  renderRoutesStub,
  renderWithMemoryRouter,
} from '~/testing/route-fixtures';

describe('route-fixtures', () => {
  test('renderWithMemoryRouter mounts a memory router tree', () => {
    const component = renderWithMemoryRouter([
      {
        element: <div>memory-router-fixture</div>,
        path: '/',
      },
    ]);

    expect(component.getByText('memory-router-fixture')).toBeInTheDocument();
  });

  test('renderRoutesStub mounts createRoutesStub output', () => {
    const component = renderRoutesStub(<div>routes-stub-fixture</div>);

    expect(component.getByText('routes-stub-fixture')).toBeInTheDocument();
  });

  test('renderRouteHarness mounts a custom stub route array', () => {
    const Inner = (): React.ReactElement => {
      return <div>multi-route-harness</div>;
    };
    const component = renderRouteHarness([{ Component: Inner, path: '/' }]);

    expect(component.getByText('multi-route-harness')).toBeInTheDocument();
  });
});
