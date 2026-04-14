import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Breadcrumb } from '../Breadcrumb';

describe('Breadcrumb', () => {
  it('renders a navigation landmark with breadcrumb accessible name', () => {
    render(<Breadcrumb />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
  });

  it('applies default flex class', () => {
    render(<Breadcrumb />);
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveClass(
      'flex',
    );
  });

  it('merges custom className with defaults', () => {
    render(<Breadcrumb className="mt-2 border-dashed" />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toHaveClass('flex', 'mt-2', 'border-dashed');
  });
});
