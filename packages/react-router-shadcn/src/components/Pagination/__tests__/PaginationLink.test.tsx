import * as React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { createRoutesStub } from 'react-router';
import { PaginationLink } from '../PaginationLink';

describe('PaginationLink', () => {
  test('renders an active link with aria-current and its data-slot', () => {
    const Component = () => (
      <PaginationLink href="/page/2" isActive={true}>
        2
      </PaginationLink>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const { container } = render(<RoutesStub />);
    const link = container.querySelector('[data-slot="pagination-link"]');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('2');
    expect(link).toHaveAttribute('aria-current', 'page');
  });
});
