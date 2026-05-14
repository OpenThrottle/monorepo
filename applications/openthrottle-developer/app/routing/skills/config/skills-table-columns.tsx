import * as React from 'react';
import classnames from 'classnames';
import type { ColumnDef } from '@tanstack/react-table';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { ScanEyeIcon } from 'lucide-react';

export type SkillsTableColumnValue =
  | RepoSkillEntry['layout']
  | RepoSkillEntry['repoRelativePath']
  | RepoSkillEntry['slug']
  | RepoSkillEntry['summary'];

/**
 * @description Stable table row id for repository skills entries.
 */
export const getSkillsTableRowId = (
  entry: RepoSkillEntry,
  index: number,
): string => {
  return entry.slug || entry.repoRelativePath || `skill-${index}`;
};

export const skillsTableColumns: ColumnDef<
  RepoSkillEntry,
  SkillsTableColumnValue
>[] = [
  {
    accessorKey: 'owner',
    cell: ({ row }) => {
      const isAgent = row.original.layout === 'agents';
      const color = isAgent
        ? 'bg-blue-500/40 border-blue-500'
        : 'bg-green-500/40 border-green-500 ';

      return (
        <div className="p-2">
          <Badge
            className={classnames('text-xs font-normal border', color)}
            size="xs"
            variant="outline"
          >
            {row.original.layout}
          </Badge>
        </div>
      );
    },
    header: () => <div className="p-2">Owner</div>,
  },
  {
    accessorKey: 'summary',
    cell: ({ row }) => (
      <div className="p-2">
        <h3 className="mb-2 line-clamp-1 text-foreground">
          /{row.original.slug}
        </h3>
        <p className="text-xs text-muted-foreground">{row.original.summary}</p>
      </div>
    ),
    header: () => <div className="p-2">Summary</div>,
  },
  {
    accessorKey: 'actions',
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="xs" variant="outline">
          <OpenThrottleClipboard
            label="Copy path"
            text={row.original.repoRelativePath}
          />
        </Button>
        <Button size="xs" variant="outline">
          <ScanEyeIcon className="size-4" />
          <span className="sr-only">View Skill</span>
        </Button>
      </div>
    ),
    header: () => <div className="text-center">Actions</div>,
  },
];
