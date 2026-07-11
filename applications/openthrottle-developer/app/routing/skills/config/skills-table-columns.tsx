import * as React from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import { ScanEyeIcon } from 'lucide-react';
import { formatPromptType } from '~/routing/prompts/utils/formatters';
import { getModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';

export type SkillsTableColumnValue =
  | RepoSkillEntry['disableModelInvocation']
  | RepoSkillEntry['layout']
  | RepoSkillEntry['repoRelativePath']
  | RepoSkillEntry['slug']
  | RepoSkillEntry['summary']
  | RepoSkillEntry['tags'];

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
    accessorKey: 'modelInvocation',
    cell: ({ row }) => {
      const badge = getModelInvocationBadge(
        row.original.disableModelInvocation,
      );

      return (
        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <Badge color={badge.color} size="xs">
                {badge.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
              {badge.tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
      );
    },
    header: () => <div className="p-2">Model invocation</div>,
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
