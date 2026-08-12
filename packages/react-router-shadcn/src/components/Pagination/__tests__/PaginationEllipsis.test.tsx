import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PaginationEllipsis } from '../PaginationEllipsis';

describe('PaginationEllipsis', () => {
  test('renders with its data-slot', () => {
    const { container } = render(
      <PaginationEllipsis className="custom-pagination-ellipsis" />,
    );
    const el = container.querySelector('[data-slot="pagination-ellipsis"]');
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass('custom-pagination-ellipsis');
  });
});
