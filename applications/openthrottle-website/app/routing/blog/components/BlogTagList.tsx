import { Badge } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import * as React from 'react';
import { Link } from 'react-router';

import type { BlogPostSummaryFragment } from '~/__generated__/graphql';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { buildBlogTagPath } from '~/routing/blog/utils/blog-urls';

export interface BlogTagListProps {
  readonly className?: string;
  readonly tags: BlogPostSummaryFragment['tags'];
}

export const BlogTagList = (
  props: BlogTagListProps,
): React.ReactElement | null => {
  const { className, tags } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (tags.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label={BLOG_COPY.tags.ariaLabel}
      className={clsx('flex flex-wrap gap-2', className)}
      data-testid="BlogTagList"
    >
      {tags.map((tag) => (
        <li key={tag.slug}>
          <Badge asChild={true}>
            <Link to={buildBlogTagPath(tag.slug)}>{tag.name}</Link>
          </Badge>
        </li>
      ))}
    </ul>
  );
};
