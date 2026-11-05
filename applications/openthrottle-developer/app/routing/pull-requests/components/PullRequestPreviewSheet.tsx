import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link, useSearchParams } from 'react-router';

import { PullRequestPreviewDetails } from '~/routing/pull-requests/components/PullRequestPreviewDetails';
import { PULL_REQUEST_LIST_PREVIEW_SEARCH_PARAM } from '~/routing/pull-requests/constants/pull-request-list-url';
import type { PullRequestsListFilters } from '~/routing/pull-requests/types/pull-requests-list-filters';

export interface PullRequestPreviewSheetProps {
  filters: PullRequestsListFilters;
  listQuery: string;
  prPreviewNumber: number | null;
  prPreviewPull: PullRequestCardFragment | null;
}

/**
 * @description Side sheet controlled by the `pr` search param on `/pull-requests`; closing removes `pr` so the URL stays the source of truth for open state.
 */
export const PullRequestPreviewSheet = (
  props: PullRequestPreviewSheetProps,
): React.ReactElement => {
  const { filters, listQuery, prPreviewNumber, prPreviewPull } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const isOpen = prPreviewNumber !== null;

  const fullPageBase = `/pull-requests/${prPreviewNumber ?? ''}`;
  const fullPagePath =
    listQuery === '' ? fullPageBase : `${fullPageBase}?${listQuery}`;

  // Handlers
  const onOpenChange = (open: boolean): void => {
    if (!open) {
      const next = new URLSearchParams(searchParams);
      next.delete(PULL_REQUEST_LIST_PREVIEW_SEARCH_PARAM);
      setSearchParams(next, { preventScrollReset: true });
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent className="flex w-full flex-col gap-4 sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle>Pull request preview</SheetTitle>
          <SheetDescription>
            Opens when the URL includes the{' '}
            <code className="font-mono text-xs">pr</code> parameter. Closing
            removes it from the address bar.
          </SheetDescription>
        </SheetHeader>

        {prPreviewNumber !== null && prPreviewPull !== null && (
          <PullRequestPreviewDetails
            filters={filters}
            fullPagePath={fullPagePath}
            pull={prPreviewPull}
          />
        )}

        {prPreviewNumber !== null && prPreviewPull === null && (
          <div
            className="flex flex-col gap-3 text-sm"
            data-testid="PullRequestPreviewSheet-missing"
          >
            <p className="text-muted-foreground">
              PR #{prPreviewNumber} is not in the current filtered list. Open
              the full page to load it from GitHub.
            </p>
            <Button asChild={true} size="sm" variant="default">
              <Link to={fullPagePath} viewTransition={true}>
                Open full page
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
