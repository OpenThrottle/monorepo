import * as React from 'react';
import { screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { GlobalErrorBoundary } from '../GlobalErrorBoundary';
import { renderRouteHarness, renderRoutesStub } from '~/testing/route-fixtures';

describe('GlobalErrorBoundary Component', () => {
  test('should render generic unknown-error message when no route error is present', () => {
    renderRoutesStub(<GlobalErrorBoundary />);

    expect(
      screen.getByRole('heading', { name: 'Unexpected error' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sorry we've encountered an unexpected problem/i),
    ).toBeInTheDocument();
  });

  test('shows chunk-load title when a ChunkLoadError is thrown', () => {
    const Boom = (): React.ReactElement => {
      const err = new Error('Loading chunk 3 failed.');
      err.name = 'ChunkLoadError';
      throw err;
    };
    renderRouteHarness([
      { Component: Boom, ErrorBoundary: GlobalErrorBoundary, path: '/' },
    ]);
    expect(
      screen.getByRole('heading', { name: 'Stale build or missing chunk' }),
    ).toBeInTheDocument();
  });
});
