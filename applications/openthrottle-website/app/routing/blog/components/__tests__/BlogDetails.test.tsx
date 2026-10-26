import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { MOCK_BLOG_POST_DETAIL } from '~/routing/blog/testing/mock.blog-posts';

import type { BlogDetailsProps } from '../BlogDetails';
import { BlogDetails } from '../BlogDetails';

const renderDetails = (props: BlogDetailsProps): RenderResult => {
  const Wrapped = () => <BlogDetails {...props} />;
  const RoutesStub = createRoutesStub([{ Component: Wrapped, path: '/' }]);

  return render(<RoutesStub />);
};

describe('BlogDetails Component', () => {
  describe('with a full post', () => {
    test('renders the title as the page heading and the rendered markdown body', () => {
      const component = renderDetails({ post: MOCK_BLOG_POST_DETAIL });

      expect(
        component.getByRole('heading', {
          level: 1,
          name: MOCK_BLOG_POST_DETAIL.title,
        }),
      ).toBeInTheDocument();
      expect(
        component.getByRole('heading', { name: 'Section heading' }),
      ).toBeInTheDocument();
      expect(component.getByText('bold').tagName).toBe('STRONG');
    });

    test('renders the cover, the way back, the updated date and the author bio', () => {
      const component = renderDetails({ post: MOCK_BLOG_POST_DETAIL });

      expect(component.getByRole('img')).toHaveAttribute(
        'alt',
        'A throttle lever',
      );
      expect(
        component.getByRole('link', { name: BLOG_COPY.details.backToList }),
      ).toHaveAttribute('href', '/blog');
      expect(
        component.getByText(`${BLOG_COPY.details.updatedPrefix} March 6, 2026`),
      ).toBeInTheDocument();
      expect(component.getByText('Writes about agents.')).toBeInTheDocument();
    });
  });

  describe('without cover, author bio or a later update', () => {
    test('omits those sections', () => {
      const component = renderDetails({
        post: {
          ...MOCK_BLOG_POST_DETAIL,
          author: null,
          coverImageUrl: null,
          updatedAt: MOCK_BLOG_POST_DETAIL.publishedAt,
        },
      });

      expect(component.queryByRole('img')).toBeNull();
      expect(component.queryByText(BLOG_COPY.details.authorHeading)).toBeNull();
      expect(
        component.queryByText(new RegExp(BLOG_COPY.details.updatedPrefix)),
      ).toBeNull();
    });
  });
});
