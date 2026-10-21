import { Button } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import * as React from 'react';
import { Link } from 'react-router';

import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { buildBlogPageHref } from '~/routing/blog/utils/blog-urls';

export interface BlogPaginationProps {
  /** List root the links are built from: `/blog` or `/blog/tags/<slug>`. */
  readonly basePath: string;
  readonly className?: string;
  readonly endCursor: string | null | undefined;
  readonly hasNextPage: boolean;
  /** True when the current request carries no `after` cursor. */
  readonly isFirstPage: boolean;
}

export const BlogPagination = (
  props: BlogPaginationProps,
): React.ReactElement | null => {
  const { basePath, className, endCursor, hasNextPage, isFirstPage } = props;

  // Hooks

  // Setup
  const { ariaLabel, newer, older } = BLOG_COPY.pagination;
  const hasOlder = hasNextPage && Boolean(endCursor);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isFirstPage && !hasOlder) {
    return null;
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={clsx(
        'border-border flex items-center justify-between gap-4 border-t pt-6',
        className,
      )}
      data-testid="BlogPagination"
    >
      {isFirstPage ? (
        <span />
      ) : (
        <Button asChild={true} variant="outline">
          <Link to={buildBlogPageHref({ after: null, basePath })}>{newer}</Link>
        </Button>
      )}
      {hasOlder ? (
        <Button asChild={true} variant="outline">
          <Link
            rel="next"
            to={buildBlogPageHref({ after: endCursor, basePath })}
          >
            {older}
          </Link>
        </Button>
      ) : null}
    </nav>
  );
};
