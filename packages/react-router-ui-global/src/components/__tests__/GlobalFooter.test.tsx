import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalFooter } from '../GlobalFooter';

describe('GlobalFooter Component', () => {
  test('renders footer tagline and health status link', () => {
    const Component = () => <GlobalFooter />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('GlobalFooter')).toBeInTheDocument();
    expect(
      screen.getByText(/Built by engineers.*Open source.*Run locally/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      expect.stringContaining('/health'),
    );
    expect(screen.getByText(/API/i)).toBeInTheDocument();
    expect(screen.getByText(/Postgres/i)).toBeInTheDocument();
    expect(screen.getByText(/Redis/i)).toBeInTheDocument();
    expect(screen.getByText(/Sockets/i)).toBeInTheDocument();
  });
});
