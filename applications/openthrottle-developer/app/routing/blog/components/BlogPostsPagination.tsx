import { Button } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router';

import { BLOG_CURSOR_PARAM } from '~/routing/blog/config/defaults';
import { BLOG_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostsPaginationProps {
  /** The cursor this page was fetched with, or `null` on the first page. */
  readonly after: string | null;
  /** Cursor of the last row on this page; pass as `after` for the next page. */
  readonly endCursor: string | null;
  readonly hasNextPage: boolean;
}

/**
 * @description Cursor pagination for the post list. "Next page" sets `after` to
 * the page's `endCursor`; "First page" clears it. Both keep the active tab and
 * search. The cursor is opaque and forward-only, so there is no "Previous".
 */
export const BlogPostsPagination = (
  props: BlogPostsPaginationProps,
): React.ReactElement | null => {
  const { after, endCursor, hasNextPage } = props;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const firstParams = new URLSearchParams(searchParams);
  const nextParams = new URLSearchParams(searchParams);

  firstParams.delete(BLOG_CURSOR_PARAM);

  if (endCursor !== null) {
    nextParams.set(BLOG_CURSOR_PARAM, endCursor);
  }

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (after === null && !hasNextPage) {
    return null;
  }

  return (
    <nav
      aria-label={BLOG_COPY.pagination}
      className="flex items-center justify-between gap-2"
      data-testid="BlogPostsPagination"
    >
      {after === null ? (
        <span />
      ) : (
        <Button asChild={true} size="sm" variant="outline">
          <Link
            preventScrollReset={true}
            to={{ search: firstParams.toString() }}
          >
            {BLOG_COPY.firstPage}
          </Link>
        </Button>
      )}
      {hasNextPage && endCursor !== null ? (
        <Button asChild={true} size="sm" variant="outline">
          <Link
            preventScrollReset={true}
            to={{ search: nextParams.toString() }}
          >
            {BLOG_COPY.nextPage}
          </Link>
        </Button>
      ) : null}
    </nav>
  );
};
