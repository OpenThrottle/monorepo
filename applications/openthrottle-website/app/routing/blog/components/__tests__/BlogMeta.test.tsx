import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { beforeEach, describe, expect, test } from 'vitest';

import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { MOCK_BLOG_POST_SUMMARY } from '~/routing/blog/testing/mock.blog-posts';

import type { BlogMetaProps } from '../BlogMeta';
import { BlogMeta } from '../BlogMeta';

const renderMeta = (props: BlogMetaProps): RenderResult =>
  render(<BlogMeta {...props} />);

describe('BlogMeta Component', () => {
  let component: RenderResult;
  let props: BlogMetaProps;

  beforeEach(() => {
    props = {
      author: MOCK_BLOG_POST_SUMMARY.author,
      publishedAt: MOCK_BLOG_POST_SUMMARY.publishedAt,
      readingTimeMinutes: 4,
    };
    component = renderMeta(props);
  });

  describe('with an author and a published date', () => {
    test('renders the author name', () => {
      expect(component.getByTestId('BlogMetaAuthor')).toHaveTextContent(
        'Ada Lovelace',
      );
    });

    test('renders a deterministic UTC date with a machine-readable value', () => {
      const time = component.getByText('March 4, 2026');

      expect(time.tagName).toBe('TIME');
      expect(time).toHaveAttribute('datetime', '2026-03-04T10:00:00.000Z');
    });

    test('renders the reading time', () => {
      expect(
        component.getByText(BLOG_COPY.meta.readingTime(4)),
      ).toBeInTheDocument();
    });
  });

  describe('without an author or a published date', () => {
    test('omits both and still renders the reading time', () => {
      component.unmount();
      component = renderMeta({
        author: null,
        publishedAt: null,
        readingTimeMinutes: 2,
      });

      expect(component.queryByTestId('BlogMetaAuthor')).not.toBeInTheDocument();
      expect(component.container.querySelector('time')).toBeNull();
      expect(
        component.getByText(BLOG_COPY.meta.readingTime(2)),
      ).toBeInTheDocument();
    });
  });
});
