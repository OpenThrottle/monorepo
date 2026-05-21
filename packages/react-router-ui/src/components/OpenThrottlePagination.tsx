import * as React from 'react';
import { Link } from 'react-router';
import {
  Button,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@openthrottle/react-router-shadcn';
import type { ProjectsSearchParamsExtras } from '../utils/index';
import {
  buildPaginationPageItems,
  buildProjectsSearchParams,
} from '../utils/index';

export interface OpenThrottlePaginationProps extends ProjectsSearchParamsExtras {
  /** Base path for pagination links (default /projects). Use /plans for plans index. */
  readonly basePath?: string;
  readonly className?: string;
  readonly limit: number;
  readonly page: number;
  /** Label for the counted items in the summary line (default &quot;projects&quot;). */
  readonly resultLabel?: string;
  readonly total: number;
}

const DEFAULT_BASE_PATH = '/projects';

export const OpenThrottlePagination = (props: OpenThrottlePaginationProps) => {
  const {
    assignees,
    basePath = DEFAULT_BASE_PATH,
    className,
    details,
    limit,
    page,
    resultLabel = 'projects',
    search,
    sortBy,
    sortOrder,
    status,
    statuses,
    total,
    view,
  } = props;

  const extras =
    (assignees !== undefined && assignees.length > 0) ||
    details !== undefined ||
    search !== undefined ||
    sortBy !== undefined ||
    sortOrder !== undefined ||
    status !== undefined ||
    (statuses !== undefined && statuses.length > 0) ||
    view !== undefined
      ? {
          assignees,
          details,
          search,
          sortBy,
          sortOrder,
          status,
          statuses,
          view,
        }
      : undefined;

  // Hooks

  // Setup
  const totalPages = Math.ceil(total / limit) || 1;
  const prevPage = page > 1 ? page - 1 : null;
  const prevParams = prevPage
    ? buildProjectsSearchParams(prevPage, limit, extras)
    : undefined;

  const nextPage = page < totalPages ? page + 1 : null;
  const nextParams = nextPage
    ? buildProjectsSearchParams(nextPage, limit, extras)
    : undefined;

  const prevUrl = prevPage ? `${basePath}?${prevParams}` : undefined;
  const nextUrl = nextPage ? `${basePath}?${nextParams}` : undefined;

  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const pageItems = buildPaginationPageItems({ page, totalPages });

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (totalPages <= 1) return null;

  return (
    <div className={className}>
      <p className="text-sm text-muted-foreground text-center my-4">
        Showing {startItem}-{endItem} of {total} {resultLabel}
      </p>

      {totalPages > 1 && (
        <Pagination data-testid="OpenThrottlePagination">
          <PaginationContent>
            <PaginationItem>
              {prevUrl ? (
                <Button
                  aria-label="Go to previous page"
                  asChild={true}
                  variant="ghost"
                >
                  <Link className="gap-1 pl-2.5" to={prevUrl}>
                    <span className="sm:inline">Previous</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  aria-disabled={true}
                  className="pointer-events-none opacity-50"
                  variant="ghost"
                >
                  <span className="sm:inline">Previous</span>
                </Button>
              )}
            </PaginationItem>

            {pageItems.map((item, index) => {
              if (item.type === 'ellipsis') {
                return (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              const pageNumber = item.page;
              const isActive = pageNumber === page;
              const url = `${basePath}?${buildProjectsSearchParams(pageNumber, limit, extras)}`;

              return (
                <PaginationItem key={pageNumber}>
                  <Button
                    aria-current={isActive ? 'page' : undefined}
                    aria-disabled={isActive}
                    asChild={true}
                    className={isActive ? 'pointer-events-none opacity-50' : ''}
                    disabled={isActive}
                    variant="outline"
                  >
                    <Link to={url}>{pageNumber}</Link>
                  </Button>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              {nextUrl ? (
                <Button
                  aria-label="Go to next page"
                  asChild={true}
                  variant="ghost"
                >
                  <Link className="gap-1 pr-2.5" to={nextUrl}>
                    {/* <ChevronRight className="h-4 w-4" /> */}
                    <span className="sm:inline">Next</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  aria-disabled={true}
                  className="pointer-events-none opacity-50"
                  variant="ghost"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:inline">Next</span>
                  {/* <ChevronRight className="h-4 w-4" /> */}
                </Button>
              )}
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};
