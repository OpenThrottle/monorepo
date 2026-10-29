import type { RenderResult } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { renderWithMemoryRouter } from '~/testing/route-fixtures';

import type { BlogPostsPaginationProps } from '../BlogPostsPagination';
import { BlogPostsPagination } from '../BlogPostsPagination';

const renderPagination = (
  props: BlogPostsPaginationProps,
  url = '/?state=live&q=hi',
): RenderResult =>
  renderWithMemoryRouter(
    [{ element: <BlogPostsPagination {...props} />, path: '/' }],
    { initialEntries: [url] },
  );

describe('BlogPostsPagination Component', () => {
  test('renders nothing on a single page', () => {
    const component = renderPagination({
      after: null,
      endCursor: 'c1',
      hasNextPage: false,
    });

    expect(
      component.queryByTestId('BlogPostsPagination'),
    ).not.toBeInTheDocument();
  });

  test('"Next page" sets after to the end cursor and keeps tab and search', () => {
    const component = renderPagination({
      after: null,
      endCursor: 'c1',
      hasNextPage: true,
    });

    expect(component.getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'href',
      '/?state=live&q=hi&after=c1',
    );
    expect(
      component.queryByRole('link', { name: 'First page' }),
    ).not.toBeInTheDocument();
  });

  test('"First page" clears the cursor', () => {
    const component = renderPagination(
      { after: 'c1', endCursor: 'c2', hasNextPage: false },
      '/?state=live&q=hi&after=c1',
    );

    expect(component.getByRole('link', { name: 'First page' })).toHaveAttribute(
      'href',
      '/?state=live&q=hi',
    );
    expect(
      component.queryByRole('link', { name: 'Next page' }),
    ).not.toBeInTheDocument();
  });
});
