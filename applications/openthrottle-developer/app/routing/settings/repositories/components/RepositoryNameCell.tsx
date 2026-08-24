import * as React from 'react';
import clsx from 'clsx';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { ChevronRightIcon, FolderIcon } from 'lucide-react';
import { Link } from 'react-router';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import type { RepositoryCheckoutRow } from '~/routing/settings/repositories/data/types';
import { repositoryDetailPath } from '~/routing/settings/repositories/utils/paths';

export interface RepositoryNameCellProps {
  /** True when this row has worktree children to expand. */
  canExpand: boolean;
  /** Tree depth of the row; only depth-0 rows link to the repository. */
  depth: number;
  isExpanded: boolean;
  onToggleExpanded: (event: unknown) => void;
  row: RepositoryCheckoutRow;
}

export const RepositoryNameCell = (
  props: RepositoryNameCellProps,
): React.ReactElement => {
  const { canExpand, depth, isExpanded, onToggleExpanded, row } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex items-start gap-1" style={{ paddingLeft: depth * 16 }}>
      {canExpand ? (
        <Button
          aria-label={
            isExpanded
              ? REPOSITORIES_TABLE_COPY.collapseGroup
              : REPOSITORIES_TABLE_COPY.expandGroup
          }
          className="mt-0.5 size-5 shrink-0"
          onClick={onToggleExpanded}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ChevronRightIcon
            aria-hidden={true}
            className={clsx(
              'size-3 transition-transform',
              isExpanded && 'rotate-90',
            )}
          />
        </Button>
      ) : (
        <span aria-hidden={true} className="size-5 shrink-0" />
      )}

      <div className="min-w-0">
        {depth === 0 && row.repositoryId !== null ? (
          <Link
            className="hover:text-primary text-xs font-medium underline underline-offset-2"
            to={repositoryDetailPath(row.repositoryId)}
          >
            {row.repositoryName}
          </Link>
        ) : null}

        {/* A discovered worktree whose repository is not registered has nothing to
            link to, so the group name renders as plain text. */}
        {depth === 0 && row.repositoryId === null ? (
          <p className="text-xs font-medium">{row.repositoryName}</p>
        ) : null}

        <div className="mt-2 flex items-center gap-2">
          <FolderIcon className="text-muted-foreground size-4" />
          <p className="text-muted-foreground truncate text-xs">
            {row.displayName}
          </p>

          {row.isWorktree ? (
            <Badge
              className="shrink-0"
              color="orange"
              size="xs"
              variant="secondary"
            >
              {REPOSITORIES_TABLE_COPY.worktreeBadge}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
};
