import * as React from 'react';
import { Link } from 'react-router';
import type { ColumnDef } from '@tanstack/react-table';
import type { PullRequestCardFragment } from '@openthrottle/openthrottle-developer-codegen';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { formatDate } from 'date-fns';
import {
  githubCommitUrl,
  githubPullChecksUrl,
  githubPullConversationUrl,
} from '~/routing/pull-requests/utils/github-pr-links';

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
export interface PullRequestsTableColumnsContext {
  readonly listQuery: string;
  readonly owner: string;
  readonly repo: string;
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
        const portalPath =
          context.listQuery === ''
            ? `/pull-requests/${pull.number}`
            : `/pull-requests/${pull.number}?${context.listQuery}`;

        return (
          <div className="max-w-md p-2">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
              <Link
                className="hover:underline"
                to={portalPath}
                viewTransition={true}
              >
                {pull.title}
              </Link>{' '}
              <span className="font-normal text-muted-foreground">
                #{pull.number}
              </span>
            </h3>
          </div>
        );
      },
      header: () => <div className="p-2">Title</div>,
    },
    {
      accessorKey: 'state',
      cell: ({ row }) => (
        <div className="p-2">
          <Badge
            variant={row.original.state === 'open' ? 'default' : 'secondary'}
          >
            {row.original.state}
          </Badge>
        </div>
      ),
      header: () => <div className="p-2">State</div>,
    },
    {
      accessorKey: 'author',
      cell: ({ row }) => (
        <div className="p-2">
          <span className="text-sm font-medium text-foreground">
            {row.original.author}
          </span>
        </div>
      ),
      header: () => <div className="p-2">Author</div>,
    },
    {
      accessorKey: 'updatedAt',
      cell: ({ row }) => {
        const pull = row.original;

        return (
          <div className="p-2 text-xs text-muted-foreground">
            Created {formatDate(pull.createdAt, 'MM/dd/yyyy')} — updated{' '}
            {formatDate(pull.updatedAt, 'MM/dd/yyyy')}
            {pull.mergedAt !== null && pull.mergedAt !== undefined ? (
              <>
                <br />
                Merged {formatDate(pull.mergedAt, 'MM/dd/yyyy')}
              </>
            ) : null}
          </div>
        );
      },
      header: () => <div className="p-2">Dates</div>,
    },
    {
      accessorKey: 'headRef',
      cell: ({ row }) => {
        const pull = row.original;

        return (
          <div className="p-2 font-mono text-xs text-muted-foreground">
            {pull.baseRef !== null && pull.baseRef !== undefined
              ? pull.baseRef
              : '—'}{' '}
            ←{' '}
            {pull.headRef !== null && pull.headRef !== undefined
              ? pull.headRef
              : '—'}
            {pull.headSha !== null && pull.headSha !== undefined ? (
              <span className="block pt-1 text-[11px] text-muted-foreground/90">
                {pull.headSha.slice(0, 7)}
              </span>
            ) : null}
          </div>
        );
      },
      header: () => <div className="p-2">Refs</div>,
    },
    {
      cell: ({ row }) => {
        const pull = row.original;
        const portalPath =
          context.listQuery === ''
            ? `/pull-requests/${pull.number}`
            : `/pull-requests/${pull.number}?${context.listQuery}`;

        return (
          <div className="flex flex-wrap gap-2 p-2">
            <Button asChild={true} size="xs" variant="outline">
              <Link to={portalPath} viewTransition={true}>
                In portal
              </Link>
            </Button>
            <Button asChild={true} size="xs" variant="outline">
              <a
                href={githubPullConversationUrl(
                  context.owner,
                  context.repo,
                  pull.number,
                )}
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub PR
              </a>
            </Button>
            <Button asChild={true} size="xs" variant="default">
              <a
                href={githubPullChecksUrl(
                  context.owner,
                  context.repo,
                  pull.number,
                )}
                rel="noopener noreferrer"
                target="_blank"
              >
                Checks (CI)
              </a>
            </Button>
            {pull.headSha !== null && pull.headSha !== undefined ? (
              <Button asChild={true} size="xs" variant="secondary">
                <a
                  href={githubCommitUrl(
                    context.owner,
                    context.repo,
                    pull.headSha,
                  )}
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
      header: () => <div className="text-center">Actions</div>,
      id: 'actions',
    },
  ];
};
