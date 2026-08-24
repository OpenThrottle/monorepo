/**
 * @description TanStack Table column definitions for the pull requests list
 * (badge state, dates like the route cards, compact GlobalPopover actions).
 */
import * as React from 'react';
import {
  ArrowRightIcon,
  GitPullRequestIcon,
  PanelRightIcon,
} from 'lucide-react';
import { Button } from '@openthrottle/react-router-shadcn';
import {
  GlobalPopover,
  GlobalPopoverActionsHeader,
} from '@openthrottle/react-router-ui-global';
import type { GlobalPopoverAction } from '@openthrottle/react-router-ui-global';
import { formatDate } from 'date-fns';
import {
  githubCommitUrl,
  githubPullChecksUrl,
  githubPullConversationUrl,
} from '~/routing/pull-requests/utils/github-pr-links';
import { PullRequestStatus } from '~/routing/pull-requests/components/PullRequestStatus';
import { buildPullRequestListSearchWithPreview } from '~/routing/pull-requests/constants/pull-request-list-url';
import { PULL_REQUESTS_ROW_ACTIONS_COPY } from '~/routing/pull-requests/data/data.copy';
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

const openExternal = (href: string): void => {
  window.open(href, '_blank', 'noopener,noreferrer');
};

/**
 * @description TanStack Table column definitions for the pull requests list.
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
        const githubHref = githubPullConversationUrl(
          context.filters.owner,
          context.filters.repo,
          pull.number,
        );
        const checksHref = githubPullChecksUrl(
          context.filters.owner,
          context.filters.repo,
          pull.number,
        );
        const label = `#${pull.number}`;

        const actions: GlobalPopoverAction[] = [
          {
            icon: <PanelRightIcon aria-hidden={true} className="size-4" />,
            id: 'preview',
            kind: 'link',
            label: PULL_REQUESTS_ROW_ACTIONS_COPY.previewSidePanel,
            to: previewPath,
          },
          {
            icon: <ArrowRightIcon aria-hidden={true} className="size-4" />,
            id: 'portal',
            kind: 'link',
            label: PULL_REQUESTS_ROW_ACTIONS_COPY.openFullPage,
            to: portalPath,
          },
          {
            icon: <GitPullRequestIcon aria-hidden={true} className="size-4" />,
            id: 'github',
            kind: 'select',
            label: PULL_REQUESTS_ROW_ACTIONS_COPY.githubPr,
            onSelect: () => {
              openExternal(githubHref);
            },
            separatorBefore: true,
          },
          {
            id: 'checks',
            kind: 'select',
            label: PULL_REQUESTS_ROW_ACTIONS_COPY.checksCi,
            onSelect: () => {
              openExternal(checksHref);
            },
          },
        ];

        return (
          <GlobalPopover
            actions={actions}
            ariaLabel={`${PULL_REQUESTS_ROW_ACTIONS_COPY.menuAriaLabelPrefix} ${label}`}
          />
        );
      },
      header: () => <GlobalPopoverActionsHeader />,
      id: 'actions',
    },
  ];
};
