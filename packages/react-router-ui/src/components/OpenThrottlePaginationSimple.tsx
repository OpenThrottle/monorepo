import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { Link, useSearchParams } from 'react-router';

export interface OpenThrottlePaginationSimpleProps {
  /** Base path for pagination links (default /). */
  readonly basePath?: string;
  readonly className?: string;
  readonly limit: number;
  readonly page: number;
  /** Label for the counted items in the summary line (default "results"). */
  readonly resultLabel?: string;
  /** Total number of items across all pages. */
  readonly total: number;
}

/**
 * @description Prev/next pager driven by a real item `total`. Computes page count from total/limit and
 * preserves the current query string (filters, search) on each page link.
 */
export const OpenThrottlePaginationSimple = (
  props: OpenThrottlePaginationSimpleProps,
): React.ReactElement | null => {
  const {
    basePath = '/',
    className,
    limit,
    page,
    resultLabel = 'results',
    total,
  } = props;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const safeLimit = limit > 0 ? limit : 1;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  // Handlers
  const hrefForPage = (nextPage: number): string => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    next.set('limit', String(limit));
    return `${basePath}?${next.toString()}`;
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div
      className={[
        'mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid="queue-jobs-pagination"
    >
      <p className="text-muted-foreground text-sm">
        Page {page} of {totalPages} · {total.toLocaleString()} {resultLabel}
      </p>
      <div className="flex flex-wrap gap-2">
        {hasPrev ? (
          <Button asChild={true} size="sm" variant="outline">
            <Link rel="prev" to={hrefForPage(page - 1)}>
              Previous
            </Link>
          </Button>
        ) : (
          <Button
            className="pointer-events-none opacity-50"
            disabled={true}
            size="sm"
            variant="outline"
          >
            Previous
          </Button>
        )}
        {hasNext ? (
          <Button asChild={true} size="sm" variant="outline">
            <Link rel="next" to={hrefForPage(page + 1)}>
              Next
            </Link>
          </Button>
        ) : (
          <Button
            className="pointer-events-none opacity-50"
            disabled={true}
            size="sm"
            variant="outline"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
};
