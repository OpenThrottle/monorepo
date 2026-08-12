import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PaginationContent } from '../PaginationContent';

describe('PaginationContent', () => {
  test('renders with its data-slot', () => {
    const { container } = render(
      <PaginationContent className="custom-pagination-content" />,
    );
    const el = container.querySelector('[data-slot="pagination-content"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('custom-pagination-content');
  });
});
