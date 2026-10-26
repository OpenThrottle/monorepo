import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { BLOG_COPY } from '~/routing/blog/data/data.copy';

import type { BlogPaginationProps } from '../BlogPagination';
import { BlogPagination } from '../BlogPagination';

const renderPagination = (props: BlogPaginationProps): RenderResult => {
  const Wrapped = () => <BlogPagination {...props} />;
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub />);
};

describe('BlogPagination Component', () => {
  const { newer, older } = BLOG_COPY.pagination;

  describe('first page with a next page', () => {
    test('links only to older posts with the cursor', () => {
      const component = renderPagination({
        basePath: '/blog',
        endCursor: 'abc 123',
        hasNextPage: true,
        isFirstPage: true,
      });

      expect(component.getByRole('link', { name: older })).toHaveAttribute(
        'href',
        '/blog?after=abc%20123',
      );
      expect(component.queryByRole('link', { name: newer })).toBeNull();
    });
  });

  describe('a later page', () => {
    test('links back to the list root and onward when more exist', () => {
      const component = renderPagination({
        basePath: '/blog/tags/git',
        endCursor: 'next',
        hasNextPage: true,
        isFirstPage: false,
      });

      expect(component.getByRole('link', { name: newer })).toHaveAttribute(
        'href',
        '/blog/tags/git',
      );
      expect(component.getByRole('link', { name: older })).toHaveAttribute(
        'href',
        '/blog/tags/git?after=next',
      );
    });

    test('links only back on the last page', () => {
      const component = renderPagination({
        basePath: '/blog',
        endCursor: null,
        hasNextPage: false,
        isFirstPage: false,
      });

      expect(component.getByRole('link', { name: newer })).toBeInTheDocument();
      expect(component.queryByRole('link', { name: older })).toBeNull();
    });
  });

  describe('a single page', () => {
    test('renders nothing', () => {
      const component = renderPagination({
        basePath: '/blog',
        endCursor: null,
        hasNextPage: false,
        isFirstPage: true,
      });

      expect(component.queryByTestId('BlogPagination')).toBeNull();
    });
  });
});
