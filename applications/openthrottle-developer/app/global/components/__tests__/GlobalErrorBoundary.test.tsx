import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalErrorBoundary } from '../GlobalErrorBoundary';

describe('GlobalErrorBoundary Component', () => {
  test('should render generic unknown-error message when no route error is present', () => {
    const Component = () => <GlobalErrorBoundary />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);

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
    const RoutesStub = createRoutesStub([
      { Component: Boom, ErrorBoundary: GlobalErrorBoundary, path: '/' },
    ]);
    render(<RoutesStub />);
    expect(
      screen.getByRole('heading', { name: 'Stale build or missing chunk' }),
    ).toBeInTheDocument();
  });
});
