import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PaginationItem } from '../PaginationItem';

describe('PaginationItem', () => {
  test('renders with its data-slot', () => {
    const { container } = render(
      <PaginationItem className="custom-pagination-item" />,
    );
    const el = container.querySelector('[data-slot="pagination-item"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('custom-pagination-item');
  });
});
