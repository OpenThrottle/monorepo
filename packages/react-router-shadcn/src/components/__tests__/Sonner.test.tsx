import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toaster } from '../Sonner';

describe('Sonner', () => {
  it('should render Toaster', () => {
    render(<Toaster />);
    expect(
      screen.getByRole('region', { name: /notifications/i }),
    ).toBeInTheDocument();
  });

  it('should render with custom position', () => {
    render(<Toaster position="top-right" />);
    const region = screen.getByRole('region', { name: /notifications/i });
    expect(region).toBeInTheDocument();
  });
});
