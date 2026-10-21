import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { MOCK_BLOG_POST_SUMMARY } from '~/routing/blog/testing/mock.blog-posts';

import type { BlogListProps } from '../BlogList';
import { BlogList } from '../BlogList';

const renderList = (props: BlogListProps): RenderResult => {
  const Wrapped = () => <BlogList {...props} />;
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub />);
};

describe('BlogList Component', () => {
  describe('with posts', () => {
    test('renders one preview per post', () => {
      const component = renderList({
        emptyKind: 'all',
        posts: [
          MOCK_BLOG_POST_SUMMARY,
          { ...MOCK_BLOG_POST_SUMMARY, id: 'post-2', slug: 'second-post' },
        ],
      });

      expect(component.getAllByTestId('BlogPreview')).toHaveLength(2);
      expect(component.queryByTestId('BlogEmptyState')).toBeNull();
    });
  });

  describe('without posts', () => {
    test('renders the empty state', () => {
      const component = renderList({ emptyKind: 'tag', posts: [] });

      expect(component.getByTestId('BlogEmptyState')).toBeInTheDocument();
      expect(component.queryByTestId('BlogList')).toBeNull();
    });
  });
});
