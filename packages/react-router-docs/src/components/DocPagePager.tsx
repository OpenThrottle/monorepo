import * as React from 'react';
import clsx from 'clsx';
import { ArrowLeftIcon, ArrowRightIcon } from 'lucide-react';
import { Link } from 'react-router';
import type { DocsNavItem } from '../utils/buildDocsNav';

export interface DocPagePagerProps {
  readonly className?: string;
  readonly next?: DocsNavItem | null;
  readonly prev?: DocsNavItem | null;
}

/**
 * Sequential prev/next navigation between docs pages. Renders the previous page
 * on the left and the next on the right; either side is omitted at a sequence
 * boundary. Pure from its `prev`/`next` props — the route/`DocPageView` derives
 * them (see `getDocPager`) and the `prevNext` flag decides whether to render it.
 *
 * @public
 */
export const DocPagePager = (props: DocPagePagerProps): React.ReactElement => {
  const { className, next = null, prev = null } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (prev === null && next === null) {
    return <></>;
  }

  return (
    <nav
      aria-label="Pagination"
      className={clsx(
        'flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-between',
        className,
      )}
      data-testid="DocPagePager"
    >
      {prev !== null ? (
        <Link
          className="hover:border-foreground group flex flex-col rounded-md border px-4 py-3 sm:items-start"
          to={prev.path}
        >
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            <ArrowLeftIcon className="size-3" />
            Previous
          </span>
          <span className="text-sm font-medium">{prev.title}</span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}

      {next !== null ? (
        <Link
          className="hover:border-foreground group flex flex-col rounded-md border px-4 py-3 sm:items-end sm:text-right"
          to={next.path}
        >
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            Next
            <ArrowRightIcon className="size-3" />
          </span>
          <span className="text-sm font-medium">{next.title}</span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
    </nav>
  );
};
