import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { BLOG_COPY } from '~/routing/blog/data/data.copy';

import type { BlogEmptyStateProps } from '../BlogEmptyState';
import { BlogEmptyState } from '../BlogEmptyState';

const renderEmptyState = (props: BlogEmptyStateProps): RenderResult => {
  const Wrapped = () => <BlogEmptyState {...props} />;
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub />);
};

describe('BlogEmptyState Component', () => {
  describe('kind="all"', () => {
    test('renders the copy without a way back', () => {
      const component = renderEmptyState({ kind: 'all' });

      expect(
        component.getByText(BLOG_COPY.emptyState.all.title),
      ).toBeInTheDocument();
      expect(component.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('kind="tag"', () => {
    test('renders the copy and a link back to the full list', () => {
      const component = renderEmptyState({ kind: 'tag' });

      expect(
        component.getByText(BLOG_COPY.emptyState.tag.title),
      ).toBeInTheDocument();
      expect(
        component.getByRole('link', {
          name: BLOG_COPY.emptyState.tag.actionLabel,
        }),
      ).toHaveAttribute('href', '/blog');
    });
  });

  describe('kind="notFound"', () => {
    test('renders the 404 copy and a link back to the full list', () => {
      const component = renderEmptyState({ kind: 'notFound' });

      expect(
        component.getByText(BLOG_COPY.emptyState.notFound.title),
      ).toBeInTheDocument();
      expect(
        component.getByRole('link', {
          name: BLOG_COPY.emptyState.notFound.actionLabel,
        }),
      ).toHaveAttribute('href', '/blog');
    });
  });
});
