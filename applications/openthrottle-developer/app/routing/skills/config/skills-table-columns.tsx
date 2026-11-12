import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';
import { Link } from 'react-router';

import type { RepoSkillEntry } from '~/routing/agents/data/data.repo-skills-registry';
import { SkillOrphanRemoveButton } from '~/routing/skills/components/SkillOrphanRemoveButton';
import type { SkillTagVocabularyOption } from '~/routing/skills/components/SkillTagChips';
import {
  SKILL_RECORD_TAGS_COPY,
  SKILLS_MODEL_INVOCATION_COPY,
  SKILLS_SOURCE_COPY,
} from '~/routing/skills/data/data.copy';
import { getSkillSourceBadge } from '~/routing/skills/utils/getSkillSourceBadge';
import { getResolvedModelInvocationDisplay } from '~/routing/skills/utils/model-invocation-badge';

export type SkillsTableColumnValue =
  | RepoSkillEntry['disableModelInvocation']
  | RepoSkillEntry['layout']
  | RepoSkillEntry['orphanedAt']
  | RepoSkillEntry['repoRelativePath']
  | RepoSkillEntry['slug']
  | RepoSkillEntry['source']
  | RepoSkillEntry['summary']
  | RepoSkillEntry['tags'];

export interface SkillsTableColumnOptions {
  readonly onAddTag?: (slug: string, tag: string) => void;
  readonly onRemoveOrphan?: (slug: string) => void;
  readonly onRemoveTag?: (slug: string, tag: string) => void;
  readonly pendingSlug?: string;
  readonly vocabulary?: readonly SkillTagVocabularyOption[];
}

/**
 * @description Stable table row id for repository skills entries.
 */
export const getSkillsTableRowId = (
  entry: RepoSkillEntry,
  index: number,
): string => {
  return entry.slug || entry.repoRelativePath || `skill-${index}`;
};

export const createSkillsTableColumns = (
  options: SkillsTableColumnOptions = {},
): ColumnDef<RepoSkillEntry, SkillsTableColumnValue>[] => {
  return [
    {
      accessorKey: 'source',
      cell: ({ row }) => {
        const sourceBadge = getSkillSourceBadge(row.original);

        const badge = (
          <Badge
            color={sourceBadge.color}
            data-testid="skill-source-badge"
            size="xs"
          >
            {sourceBadge.label}
          </Badge>
        );

        const sourceLink = (
          <a
            data-testid="skill-source-link"
            href={sourceBadge.href}
            rel="noreferrer"
            target="_blank"
          >
            {badge}
          </a>
        );

        return (
          <div className="p-2">
            <Tooltip>
              <TooltipTrigger asChild={true}>
                {sourceBadge.href ? sourceLink : badge}
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" side="top">
                {sourceBadge.tooltip}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      },
      header: () => (
        <div className="p-2">{SKILLS_SOURCE_COPY.columnHeader}</div>
      ),
    },
    {
      accessorKey: 'summary',
      cell: ({ row }) => {
        const { onRemoveOrphan, pendingSlug } = options;

        const tags = row.original.tags ?? [];
        const isOrphan = row.original.orphanedAt != null;
        const slugLabel = `/${row.original.slug}`;

        const renderRemoveOrphan = (): React.ReactNode => {
          if (onRemoveOrphan == null) {
            return null;
          }

          return (
            <SkillOrphanRemoveButton
              disabled={pendingSlug === row.original.slug}
              onRemove={() => onRemoveOrphan(row.original.slug)}
            />
          );
        };

        const orphanTitle = (
          <>
            <span>{slugLabel}</span>
            <Badge color="yellow" data-testid="skill-orphan-badge" size="xs">
              {SKILL_RECORD_TAGS_COPY.orphanBadge}
            </Badge>
            {renderRemoveOrphan()}
          </>
        );
        const slugLink = (
          <Link className="hover:underline" to={`/skills/${row.original.slug}`}>
            {slugLabel}
          </Link>
        );

        return (
          <div className="space-y-4 p-2">
            <h3 className="text-foreground line-clamp-1 flex flex-wrap items-center gap-2">
              {isOrphan ? orphanTitle : slugLink}
            </h3>

            <MarkdownRenderer
              className="line-clamp-2 overflow-hidden [&_p]:!mb-0 [&_p]:!text-xs"
              source={row.original.summary}
            />

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge color="slate" key={tag} size="xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        );
      },
      header: () => <div className="p-2">Summary</div>,
    },
    {
      accessorKey: 'modelInvocation',
      cell: ({ row }) => {
        const { badge, isOverridden } = getResolvedModelInvocationDisplay(
          row.original,
        );

        const { overrideIndicatorLabel, overrideTooltip } =
          SKILLS_MODEL_INVOCATION_COPY;

        const overrideIndicator = (
          <Tooltip>
            <TooltipTrigger asChild={true}>
              <span
                aria-label={overrideIndicatorLabel}
                className="cursor-help text-xs leading-none font-bold text-amber-500"
                data-testid="model-invocation-override"
              >
                *
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
              {overrideTooltip}
            </TooltipContent>
          </Tooltip>
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
              {isOverridden ? overrideIndicator : null}
            </div>
          </div>
        );
      },
      header: () => <div className="p-2">Invocation</div>,
    },
  ];
};

export const skillsTableColumns = createSkillsTableColumns();
