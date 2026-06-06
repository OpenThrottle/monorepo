import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router';
import type { RepoPersonaEntry } from '~/routing/agents/data/repo-personas-registry';
import { Button } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { ScanEyeIcon } from 'lucide-react';

export type PersonasTableColumnValue =
  | RepoPersonaEntry['repoRelativePath']
  | RepoPersonaEntry['slug']
  | RepoPersonaEntry['summary'];

/**
 * @description Stable table row id for repository persona entries.
 */
export const getPersonasTableRowId = (
  entry: RepoPersonaEntry,
  index: number,
): string => {
  return entry.slug || entry.repoRelativePath || `persona-${index}`;
};

export const personasTableColumns: ColumnDef<
  RepoPersonaEntry,
  PersonasTableColumnValue
>[] = [
  {
    accessorKey: 'summary',
    cell: ({ row }) => (
      <div className="p-2">
        <h3 className="mb-2 line-clamp-1 text-foreground">
          /{row.original.slug}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {row.original.summary}
        </p>
      </div>
    ),
    header: () => <div className="p-2">Summary</div>,
  },
  {
    accessorKey: 'actions',
    cell: ({ row }) => (
      <div className="p-2 flex gap-2">
        <OpenThrottleClipboard
          label="Copy path"
          text={row.original.repoRelativePath}
        />
        <Button asChild={true} size="xs" variant="outline">
          <Link to={`/personas/${encodeURIComponent(row.original.slug)}`}>
            <ScanEyeIcon className="size-4" />
            <span className="sr-only">View persona</span>
          </Link>
        </Button>
      </div>
    ),
    header: () => <div className="p-2 text-center">Actions</div>,
  },
];
