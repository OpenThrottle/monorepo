import * as React from 'react';
import { formatDate } from 'date-fns';
import { GitPullRequestIcon } from 'lucide-react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@openthrottle/react-router-shadcn';
import { Link, useSearchParams } from 'react-router';
import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { PullRequestStatus } from '~/routing/pull-requests/components/PullRequestStatus';
import { PULL_REQUEST_LIST_PREVIEW_SEARCH_PARAM } from '~/routing/pull-requests/constants/pull-request-list-url';
import type { PullRequestsListFilters } from '~/routing/pull-requests/types/pull-requests-list-filters';
import {
  githubPullChecksUrl,
  githubPullConversationUrl,
} from '~/routing/pull-requests/utils/github-pr-links';

export interface PullRequestPreviewSheetProps {
  readonly filters: PullRequestsListFilters;
  readonly listQuery: string;
  readonly prPreviewNumber: number | null;
  readonly prPreviewPull: PullRequestCardFragment | null;
}

/**
 * @description Side sheet controlled by the `pr` search param on `/pull-requests`; closing removes `pr` so the URL stays the source of truth for open state.
 */
export const PullRequestPreviewSheet = (
  props: PullRequestPreviewSheetProps,
): React.ReactElement => {
  const { filters, listQuery, prPreviewNumber, prPreviewPull } = props;

  const [searchParams, setSearchParams] = useSearchParams();
  const isOpen = prPreviewNumber !== null;

  const onOpenChange = (open: boolean): void => {
    if (!open) {
      const next = new URLSearchParams(searchParams);
      next.delete(PULL_REQUEST_LIST_PREVIEW_SEARCH_PARAM);
      setSearchParams(next, { preventScrollReset: true });
    }
  };

  const fullPagePath =
    listQuery === ''
      ? `/pull-requests/${prPreviewNumber ?? ''}`
      : `/pull-requests/${prPreviewNumber ?? ''}?${listQuery}`;

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

        {prPreviewNumber !== null && prPreviewPull !== null ? (
          <div
            className="flex flex-col gap-4"
            data-testid="PullRequestPreviewSheet-body"
          >
            <div className="flex flex-wrap items-center gap-2">
              <PullRequestStatus state={prPreviewPull.state} />
              <span className="text-muted-foreground text-sm">
                #{prPreviewPull.number}
              </span>
            </div>
            <h3 className="text-lg font-semibold leading-snug">
              {prPreviewPull.title}
            </h3>
            <p className="text-muted-foreground text-sm">
              <span className="font-medium text-foreground">
                {prPreviewPull.author}
              </span>{' '}
              · Created {formatDate(prPreviewPull.createdAt, 'MM/dd/yyyy')} —
              updated {formatDate(prPreviewPull.updatedAt, 'MM/dd/yyyy')}
            </p>
            {prPreviewPull.baseRef !== null ||
            prPreviewPull.headRef !== null ? (
              <p className="text-muted-foreground font-mono text-xs">
                {prPreviewPull.baseRef !== null ? prPreviewPull.baseRef : '—'} ←{' '}
                {prPreviewPull.headRef !== null ? prPreviewPull.headRef : '—'}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button asChild={true} size="sm" variant="default">
                <Link to={fullPagePath} viewTransition={true}>
                  Open full page
                </Link>
              </Button>
              <Button asChild={true} size="sm" variant="outline">
                <a
                  href={githubPullConversationUrl(
                    filters.owner,
                    filters.repo,
                    prPreviewPull.number,
                  )}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <GitPullRequestIcon className="mr-1 inline size-4" />
                  GitHub
                </a>
              </Button>
              <Button asChild={true} size="sm" variant="secondary">
                <a
                  href={githubPullChecksUrl(
                    filters.owner,
                    filters.repo,
                    prPreviewPull.number,
                  )}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Checks (CI)
                </a>
              </Button>
            </div>
          </div>
        ) : null}

        {prPreviewNumber !== null && prPreviewPull === null ? (
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
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
