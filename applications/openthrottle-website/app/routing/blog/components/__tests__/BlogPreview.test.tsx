import type { RenderResult } from '@testing-library/react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { MOCK_BLOG_POST_SUMMARY } from '~/routing/blog/testing/mock.blog-posts';

import type { BlogPreviewProps } from '../BlogPreview';
import { BlogPreview } from '../BlogPreview';

type StubRoute = Parameters<typeof createRoutesStub>[0][number];

const renderPreview = (
  props: BlogPreviewProps,
  extraRoutes: readonly StubRoute[] = [],
): RenderResult => {
  const Wrapped = () => <BlogPreview {...props} />;
  const RoutesStub = createRoutesStub([
    { Component: Wrapped, path: '/' },
    ...extraRoutes,
  ]);

  return render(<RoutesStub />);
};

describe('BlogPreview Component', () => {
  describe('with a cover image', () => {
    test('links the title to the post and renders cover, excerpt and tags', () => {
      const component = renderPreview({ post: MOCK_BLOG_POST_SUMMARY });

      expect(
        component.getByRole('link', { name: MOCK_BLOG_POST_SUMMARY.title }),
      ).toHaveAttribute('href', '/blog/plans-to-commits');
      expect(component.getByRole('img')).toHaveAttribute(
        'alt',
        'A throttle lever',
      );
      expect(component.getByText('How plans become commits.')).toBeVisible();
      expect(component.getByRole('link', { name: 'Agents' })).toHaveAttribute(
        'href',
        '/blog/tags/agents',
      );
    });
  });

  describe('activating the title link', () => {
    test('navigates away from the list to the post route', async () => {
      const component = renderPreview({ post: MOCK_BLOG_POST_SUMMARY }, [
        { Component: React.Fragment, path: '/blog/:slug' },
      ]);

      await userEvent.click(
        component.getByRole('link', { name: MOCK_BLOG_POST_SUMMARY.title }),
      );

      await waitFor(() => {
        expect(component.queryByTestId('BlogPreview')).toBeNull();
      });
    });
  });

  describe('without a cover image or excerpt', () => {
    test('renders a decorative placeholder instead of an image', () => {
      const component = renderPreview({
        post: {
          ...MOCK_BLOG_POST_SUMMARY,
          coverImageUrl: null,
          excerpt: null,
        },
      });

      expect(component.queryByRole('img')).toBeNull();
      expect(component.getByTestId('BlogPreview')).toBeInTheDocument();
    });
  });
});
