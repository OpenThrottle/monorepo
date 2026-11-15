import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { Breadcrumb } from '../Breadcrumb';

describe('Breadcrumb', () => {
  it('renders a navigation landmark with breadcrumb accessible name', () => {
    const component = render(<Breadcrumb />);
    const nav = component.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
  });

  it('applies default flex class', () => {
    const component = render(<Breadcrumb />);
    expect(
      component.getByRole('navigation', { name: 'Breadcrumb' }),
    ).toHaveClass('flex');
  });

  it('merges custom className with defaults', () => {
    const component = render(<Breadcrumb className="mt-2 border-dashed" />);
    const nav = component.getByRole('navigation', { name: 'Breadcrumb' });
    expect(nav).toHaveClass('flex', 'mt-2', 'border-dashed');
  });
});
