import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalFooter } from '../GlobalFooter';

describe('GlobalFooter Component', () => {
  test('should render footer with tagline and health link when beta preview is enabled', () => {
    const Component = () => <GlobalFooter />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);

    expect(screen.getByTestId('GlobalFooter')).toBeInTheDocument();
    expect(screen.getByText(/Built by engineers/)).toBeInTheDocument();
    const healthRow = screen.getByRole('link', { name: /API/i });
    expect(healthRow).toHaveAttribute(
      'href',
      expect.stringMatching(/\/health$/),
    );
  });
});
