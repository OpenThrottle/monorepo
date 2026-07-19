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
import {
  SKILLS_MODEL_INVOCATION_COPY,
  SKILLS_SOURCE_COPY,
} from '~/routing/skills/data/data.copy';
import { getResolvedModelInvocationDisplay } from '~/routing/skills/utils/model-invocation-badge';

export type SkillsTableColumnValue =
  | RepoSkillEntry['disableModelInvocation']
  | RepoSkillEntry['layout']
  | RepoSkillEntry['repoRelativePath']
  | RepoSkillEntry['slug']
  | RepoSkillEntry['source']
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
    accessorKey: 'source',
    cell: ({ row }) => {
      const isOpenThrottle = row.original.source === 'openthrottle';
      const { sourceUrl } = row.original;

      const badge = (
        <Badge
          color={isOpenThrottle ? 'violet' : 'slate'}
          data-testid="skill-source-badge"
          size="xs"
        >
          {isOpenThrottle
            ? SKILLS_SOURCE_COPY.openthrottleLabel
            : SKILLS_SOURCE_COPY.externalLabel}
        </Badge>
      );

      const tooltip = isOpenThrottle
        ? SKILLS_SOURCE_COPY.openthrottleTooltip
        : sourceUrl
          ? `${SKILLS_SOURCE_COPY.externalUrlTooltipPrefix} ${sourceUrl}`
          : SKILLS_SOURCE_COPY.externalTooltip;

      return (
        <div className="p-2">
          <Tooltip>
            <TooltipTrigger asChild={true}>
              {!isOpenThrottle && sourceUrl ? (
                <a
                  data-testid="skill-source-link"
                  href={sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {badge}
                </a>
              ) : (
                badge
              )}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
      );
    },
    header: () => <div className="p-2">{SKILLS_SOURCE_COPY.columnHeader}</div>,
  },
  {
    accessorKey: 'modelInvocation',
    cell: ({ row }) => {
      const { badge, isOverridden } = getResolvedModelInvocationDisplay(
        row.original,
      );

      return (
        <div className="p-2">
          <div className="flex items-center gap-1">
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
            {isOverridden ? (
              <Tooltip>
                <TooltipTrigger asChild={true}>
                  <span
                    aria-label={
                      SKILLS_MODEL_INVOCATION_COPY.overrideIndicatorLabel
                    }
                    className="cursor-help text-xs leading-none font-bold text-amber-500"
                    data-testid="model-invocation-override"
                  >
                    *
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs" side="top">
                  {SKILLS_MODEL_INVOCATION_COPY.overrideTooltip}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
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
