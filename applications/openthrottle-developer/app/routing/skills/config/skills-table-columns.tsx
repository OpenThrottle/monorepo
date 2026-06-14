import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { Badge, Button } from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { ScanEyeIcon } from 'lucide-react';
import { formatPromptType } from '~/routing/prompts/utils/formatters';

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

      return (
        <div className="p-2">
          <Badge color={isAgent ? 'blue' : 'green'} size="xs">
            {formatPromptType(row.original.layout)}
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
        <h3 className="text-foreground mb-2 line-clamp-1">
          /{row.original.slug}
        </h3>
        <p className="text-muted-foreground line-clamp-2 text-xs">
          {row.original.summary}
        </p>
      </div>
    ),
    header: () => <div className="p-2">Summary</div>,
  },
  {
    accessorKey: 'actions',
    cell: ({ row }) => (
      <div className="flex gap-2 p-2">
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
    header: () => <div className="p-2 text-center">Actions</div>,
  },
];
