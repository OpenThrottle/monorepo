import clsx from 'clsx';
import * as React from 'react';

import type { BlogPostSummaryFragment } from '~/__generated__/graphql';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';

import { BlogEmptyState } from './BlogEmptyState';
import { BlogPreview } from './BlogPreview';

export interface BlogListProps {
  readonly className?: string;
  /** Which empty state to show when `posts` is empty. */
  readonly emptyKind: 'all' | 'tag';
  readonly posts: readonly BlogPostSummaryFragment[];
}

export const BlogList = (props: BlogListProps): React.ReactElement => {
  const { className, emptyKind, posts } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (posts.length === 0) {
    return <BlogEmptyState className={className} kind={emptyKind} />;
  }

  return (
    <ul
      aria-label={BLOG_COPY.list.ariaLabel}
      className={clsx('grid gap-6 md:grid-cols-2 lg:grid-cols-3', className)}
      data-testid="BlogList"
    >
      {posts.map((post) => (
        <li className="flex" key={post.id}>
          <BlogPreview className="w-full" post={post} />
        </li>
      ))}
    </ul>
  );
};
