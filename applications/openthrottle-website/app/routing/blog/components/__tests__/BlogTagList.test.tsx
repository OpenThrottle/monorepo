import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { MOCK_BLOG_POST_SUMMARY } from '~/routing/blog/testing/mock.blog-posts';

import type { BlogTagListProps } from '../BlogTagList';
import { BlogTagList } from '../BlogTagList';

const renderTagList = (props: BlogTagListProps): RenderResult => {
  const Wrapped = () => <BlogTagList {...props} />;
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub />);
};

describe('BlogTagList Component', () => {
  describe('with tags', () => {
    test('renders one link per tag pointing at its tag page', () => {
      const component = renderTagList({ tags: MOCK_BLOG_POST_SUMMARY.tags });

      expect(component.getByRole('link', { name: 'Agents' })).toHaveAttribute(
        'href',
        '/blog/tags/agents',
      );
      expect(component.getByRole('link', { name: 'Git' })).toHaveAttribute(
        'href',
        '/blog/tags/git',
      );
    });
  });

  describe('without tags', () => {
    test('renders nothing', () => {
      const component = renderTagList({ tags: [] });

      expect(component.queryByTestId('BlogTagList')).not.toBeInTheDocument();
    });
  });
});
