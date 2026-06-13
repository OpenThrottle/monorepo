import * as React from 'react';
import {
  ArrowRightIcon,
  GitPullRequestIcon,
  PanelRightIcon,
} from 'lucide-react';
import { Button } from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import {
  githubCommitUrl,
  githubPullChecksUrl,
  githubPullConversationUrl,
} from '~/routing/pull-requests/utils/github-pr-links';
import { Link } from 'react-router';
import { PullRequestStatus } from '~/routing/pull-requests/components/PullRequestStatus';
import { buildPullRequestListSearchWithPreview } from '~/routing/pull-requests/constants/pull-request-list-url';
import type { ColumnDef } from '@tanstack/react-table';
import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import type { PullRequestsListFilters } from '~/routing/pull-requests/types/pull-requests-list-filters';

export type PullRequestsTableColumnValue =
  | PullRequestCardFragment['author']
  | PullRequestCardFragment['baseRef']
  | PullRequestCardFragment['createdAt']
  | PullRequestCardFragment['headRef']
  | PullRequestCardFragment['headSha']
  | PullRequestCardFragment['htmlUrl']
  | PullRequestCardFragment['mergedAt']
  | PullRequestCardFragment['number']
  | PullRequestCardFragment['state']
  | PullRequestCardFragment['title']
  | PullRequestCardFragment['updatedAt'];

/**
 * @description Context for PR table columns that build portal routes and GitHub URLs (aligned with pull-requests cards).
 */
interface PullRequestsTableColumnsContext {
  readonly filters: PullRequestsListFilters;
  readonly listQuery: string;
}

/**
 * @description Stable row id derived from the GitHub pull request number.
 */
export const getPullRequestsTableRowId = (
  pull: PullRequestCardFragment,
  _index: number,
): string => {
  return String(pull.number);
};

/**
 * @description TanStack Table column definitions for the pull requests list (badge state, dates like the route cards, compact actions).
 */
export const createPullRequestsTableColumns = (
  context: PullRequestsTableColumnsContext,
): ColumnDef<PullRequestCardFragment, PullRequestsTableColumnValue>[] => {
  return [
    {
      accessorKey: 'title',
      cell: ({ row }) => {
        const pull = row.original;
        return (
          <div className="p-2">
            <div className="mb-2 flex items-center gap-4">
              <PullRequestStatus state={pull.state} />
              <h3 className="line-clamp-1 font-medium">
                #{row.original.number} {row.original.title}
              </h3>
            </div>
            <p className="text-muted-foreground text-xs">
              Created {formatDate(pull.createdAt, 'MM/dd/yyyy')} — Updated{' '}
              {formatDate(pull.updatedAt, 'MM/dd/yyyy')}
            </p>
          </div>
        );
      },
      header: () => <div className="p-2">Title</div>,
    },
    {
      accessorKey: 'author',
      cell: ({ row }) => {
        const pull = row.original;
        const { owner, repo } = context.filters;

        return (
          <div className="flex flex-col gap-2 p-2">
            <span className="text-foreground text-sm font-medium">
              {row.original.author}
            </span>

            {pull.headSha !== null && pull.headSha !== undefined ? (
              <Button asChild={true} size="xs" variant="secondary">
                <a
                  href={githubCommitUrl(owner, repo, pull.headSha)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Head{' '}
                  <span className="font-mono">{pull.headSha.slice(0, 7)}</span>
                </a>
              </Button>
            ) : null}
          </div>
        );
      },
      header: () => <div className="p-2">Author</div>,
    },
    // {
    //   accessorKey: 'updatedAt',
    //   cell: ({ row }) => {
    //     const pull = row.original;

    //     return (
    //       <div className="p-2 text-xs text-muted-foreground">
    //         Created {formatDate(pull.createdAt, 'MM/dd/yyyy')} — updated{' '}
    //         {formatDate(pull.updatedAt, 'MM/dd/yyyy')}
    //         {pull.mergedAt !== null && pull.mergedAt !== undefined ? (
    //           <>
    //             <br />
    //             Merged {formatDate(pull.mergedAt, 'MM/dd/yyyy')}
    //           </>
    //         ) : null}
    //       </div>
    //     );
    //   },
    //   header: () => <div className="p-2">Dates</div>,
    // },
    // {
    //   accessorKey: 'headRef',
    //   cell: ({ row }) => {
    //     const pull = row.original;

    //     return (
    //       <div className="p-2 font-mono text-xs text-muted-foreground">
    //         {pull.baseRef !== null && pull.baseRef !== undefined
    //           ? pull.baseRef
    //           : '—'}{' '}
    //         ←{' '}
    //         {pull.headRef !== null && pull.headRef !== undefined
    //           ? pull.headRef
    //           : '—'}
    //         {pull.headSha !== null && pull.headSha !== undefined ? (
    //           <span className="block pt-1 text-[11px] text-muted-foreground/90">
    //             {pull.headSha.slice(0, 7)}
    //           </span>
    //         ) : null}
    //       </div>
    //     );
    //   },
    //   header: () => <div className="p-2">Refs</div>,
    // },
    {
      cell: ({ row }) => {
        const pull = row.original;
        const previewSearch = buildPullRequestListSearchWithPreview(
          context.listQuery,
          pull.number,
        );
        const previewPath = `/pull-requests?${previewSearch}`;
        const portalPath =
          context.listQuery === ''
            ? `/pull-requests/${pull.number}`
            : `/pull-requests/${pull.number}?${context.listQuery}`;

        return (
          <div className="flex flex-wrap gap-2 p-2">
            <Button asChild={true} size="xs" variant="outline">
              <Link to={previewPath} viewTransition={true}>
                <PanelRightIcon aria-hidden={true} className="h-4 w-4" />
                <span className="sr-only">Preview in side panel</span>
              </Link>
            </Button>
            <Button asChild={true} size="xs" variant="outline">
              <Link to={portalPath} viewTransition={true}>
                <ArrowRightIcon aria-hidden={true} className="h-4 w-4" />
                <span className="sr-only">Open full pull request page</span>
              </Link>
            </Button>
            <Button asChild={true} size="xs" variant="outline">
              <a
                href={githubPullConversationUrl(
                  context.filters.owner,
                  context.filters.repo,
                  pull.number,
                )}
                rel="noopener noreferrer"
                target="_blank"
              >
                <GitPullRequestIcon className="h-4 w-4" />
                <span className="sr-only">GitHub PR</span>
              </a>
            </Button>
            <Button asChild={true} size="xs" variant="default">
              <a
                href={githubPullChecksUrl(
                  context.filters.owner,
                  context.filters.repo,
                  pull.number,
                )}
                rel="noopener noreferrer"
                target="_blank"
              >
                Checks (CI)
              </a>
            </Button>
          </div>
        );
      },
      header: () => <div className="text-center">Actions</div>,
      id: 'actions',
    },
  ];
};
