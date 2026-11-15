import {
  Button,
  cn,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@openthrottle/react-router-shadcn';
import { ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router';

import type { ProjectsSearchParamsExtras } from '../utils/index';
import {
  buildPaginationPageItems,
  buildPreservedSearchParams,
  buildProjectsSearchParams,
} from '../utils/index';
import type { OpenThrottlePaginationLimitProps } from './OpenThrottlePaginationLimit';
import { OpenThrottlePaginationLimit } from './OpenThrottlePaginationLimit';

export interface OpenThrottlePaginationProps extends ProjectsSearchParamsExtras {
  /**
   * Route the page links point at, e.g. `/plans`. Required: a default would
   * silently send another route's pager somewhere else.
   */
  readonly basePath: string;
  readonly className?: string;
  readonly limit: number;
  readonly page: number;
  /** Opt in to a page-size select: the footer becomes one row and shows even on a single page. */
  readonly pageSize?: Pick<
    OpenThrottlePaginationLimitProps,
    'label' | 'options'
  >;
  /**
   * Opt in to building page links from the *live* query string instead of the
   * `extras` contract: the current params are cloned and only `page`/`limit`
   * are rewritten, so route-local filters the pager knows nothing about
   * (`?source=`, a route's own `?search=`) survive a page change. Off by
   * default — routes already modelled by `ProjectsSearchParamsExtras` keep
   * their canonical, extras-built URLs.
   */
  readonly preserveSearchParams?: boolean;
  /**
   * Plural noun for the counted items in the summary line, e.g. &quot;plans&quot;.
   * Required so a forgotten label can never silently render the wrong entity.
   */
  readonly resultLabel: string;
  readonly total: number;
}

export const OpenThrottlePagination = (
  props: OpenThrottlePaginationProps,
): React.ReactElement | null => {
  const {
    basePath,
    className,
    limit,
    page,
    pageSize,
    preserveSearchParams = false,
    resultLabel,
    total,
    ...allExtras
  } = props;

  const hasExtras = Object.values(allExtras).some((value) => {
    return Array.isArray(value) ? value.length > 0 : value !== undefined;
  });
  const extras = hasExtras ? allExtras : undefined;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const totalPages = Math.ceil(total / limit) || 1;
  const buildParams = (targetPage: number, targetLimit = limit): string => {
    return preserveSearchParams
      ? buildPreservedSearchParams(searchParams, targetPage, targetLimit)
      : buildProjectsSearchParams(targetPage, targetLimit, extras);
  };
  const buildLimitHref = (targetLimit: number): string => {
    return `${basePath}?${buildParams(1, targetLimit)}`;
  };
  const hasPageSize = pageSize !== undefined;
  const prevUrl = page > 1 ? `${basePath}?${buildParams(page - 1)}` : undefined;
  const nextUrl =
    page < totalPages ? `${basePath}?${buildParams(page + 1)}` : undefined;
  const startItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const pageItems = buildPaginationPageItems({ page, totalPages });

  // Handlers
  const renderStep = (
    url: string | undefined,
    label: string,
    icon: React.ReactElement,
  ): React.ReactElement => {
    if (url === undefined) {
      return (
        <Button
          aria-disabled={true}
          className="pointer-events-none opacity-50"
          variant="ghost"
        >
          {icon}
        </Button>
      );
    }

    return (
      <Button aria-label={label} asChild={true} variant="ghost">
        <Link className="gap-1 px-2.5" to={url}>
          {icon}
        </Link>
      </Button>
    );
  };

  // Markup
  const prevStep = renderStep(
    prevUrl,
    'Go to previous page',
    <ChevronsLeftIcon className="h-4 w-4" />,
  );
  const nextStep = renderStep(
    nextUrl,
    'Go to next page',
    <ChevronsRightIcon className="h-4 w-4" />,
  );
  const limitControl = hasPageSize && (
    <OpenThrottlePaginationLimit
      buildHref={buildLimitHref}
      label={pageSize.label}
      limit={limit}
      options={pageSize.options}
    />
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (total === 0 || (totalPages <= 1 && !hasPageSize)) {
    return null;
  }

  return (
    <div
      className={cn(
        hasPageSize && 'flex flex-wrap items-center justify-between gap-3',
        className,
      )}
    >
      <p
        className={cn(
          'text-muted-foreground text-sm',
          !hasPageSize && 'my-4 text-center',
        )}
      >
        Showing {startItem}-{endItem} of {total} {resultLabel}
      </p>

      {totalPages > 1 && (
        <Pagination
          className={cn(hasPageSize && 'mx-0 w-auto')}
          data-testid="OpenThrottlePagination"
        >
          <PaginationContent>
            <PaginationItem>{prevStep}</PaginationItem>

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
              const url = `${basePath}?${buildParams(pageNumber)}`;

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

            <PaginationItem>{nextStep}</PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      {limitControl}
    </div>
  );
};
