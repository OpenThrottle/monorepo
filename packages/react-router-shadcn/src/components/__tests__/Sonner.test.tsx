import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Toaster } from '../Sonner';

describe('Sonner', () => {
  it('should render Toaster', () => {
    const { container } = render(<Toaster />);
    const toaster = container.querySelector('[data-sonner-toaster]');
    expect(toaster).toBeInTheDocument();
  });

  it('should render with custom position', () => {
    const { container } = render(<Toaster position="top-right" />);
    const toaster = container.querySelector('[data-sonner-toaster]');
    expect(toaster).toBeInTheDocument();
  });
});
