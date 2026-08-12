import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  test('renders a navigation landmark with its data-slot', () => {
    const { container } = render(<Pagination className="custom-pagination" />);
    const nav = container.querySelector('nav[data-slot="pagination"]');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass('custom-pagination');
    expect(nav).toHaveAttribute('aria-label', 'pagination');
  });
});
