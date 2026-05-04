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
});
