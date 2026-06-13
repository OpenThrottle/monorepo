import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';

export interface OpenThrottlePaginationSimpleProps {
  /** Base path for pagination links (default /projects). Use /plans for plans index. */
  readonly basePath?: string;
  readonly className?: string;
  readonly limit: number;
  readonly page: number;
  /** Label for the counted items in the summary line (default &quot;projects&quot;). */
  readonly resultLabel?: string;
  readonly total: number;
}

export const OpenThrottlePaginationSimple = (
  props: OpenThrottlePaginationSimpleProps,
): React.ReactElement | null => {
  const {
    // basePath = '/',
    // className,
    limit,
    page,
    // resultLabel = 'projects',
    total,
  } = props;

  // Hooks
  const [_bool, _setBool] = React.useState(false);

  // Setup
  const hasNext = false;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (total <= 1) {
    return null;
  }

  return (
    <div
      className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
      data-testid="queue-jobs-pagination"
    >
      <p className="text-muted-foreground text-sm">
        Page {page} of {total} · {limit} per page
      </p>
      <div className="flex flex-wrap gap-2">
        {page > 1 ? (
          <Button asChild={true} size="sm" variant="outline">
            <Link
              rel="prev"
              // to={buildJobsPageHref(page - 1)}
              to="/"
            >
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
            <Link
              rel="next"
              // to={buildJobsPageHref(page + 1)}
              to="/"
            >
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
