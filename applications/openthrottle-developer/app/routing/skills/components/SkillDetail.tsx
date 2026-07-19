import * as React from 'react';
import clsx from 'clsx';
import {
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { OpenThrottleClipboard } from '@openthrottle/react-router-ui';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import {
  SKILL_DETAIL_COPY,
  SKILLS_SOURCE_COPY,
} from '~/routing/skills/data/data.copy';
import { getResolvedModelInvocationDisplay } from '~/routing/skills/utils/model-invocation-badge';

export interface SkillDetailProps {
  className?: string;
  /** Raw SKILL.md content; empty renders the unreadable-file notice. */
  content: string;
  entry: RepoSkillEntry;
}

export const SkillDetail = (props: SkillDetailProps): React.ReactElement => {
  const { className, content, entry } = props;

  // Hooks

  // Setup
  const isOpenThrottle = entry.source === 'openthrottle';
  const { badge: invocationBadge } = getResolvedModelInvocationDisplay(entry);
  const sourceTooltip = isOpenThrottle
    ? SKILLS_SOURCE_COPY.openthrottleTooltip
    : entry.sourceUrl
      ? `${SKILLS_SOURCE_COPY.externalUrlTooltipPrefix} ${entry.sourceUrl}`
      : SKILLS_SOURCE_COPY.externalTooltip;

  // Handlers

  // Markup
  const sourceBadge = (
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

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-col gap-4', className)}
      data-testid="SkillDetail"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-foreground text-lg font-semibold">
            /{entry.slug}
          </h2>

          <Tooltip>
            <TooltipTrigger asChild={true}>
              {!isOpenThrottle && entry.sourceUrl ? (
                <a
                  data-testid="skill-source-link"
                  href={entry.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {sourceBadge}
                </a>
              ) : (
                sourceBadge
              )}
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
              {sourceTooltip}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild={true}>
              <Badge color={invocationBadge.color} size="xs">
                {invocationBadge.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs" side="top">
              {invocationBadge.tooltip}
            </TooltipContent>
          </Tooltip>

          {(entry.tags ?? []).map((tag) => (
            <Badge color="blue" key={tag} size="xs">
              {tag}
            </Badge>
          ))}
        </div>

        <p className="text-muted-foreground text-sm">{entry.summary}</p>

        <div className="flex items-center gap-2">
          <code className="text-muted-foreground text-xs">
            {entry.repoRelativePath}
          </code>
          <Button size="xs" variant="outline">
            <OpenThrottleClipboard
              label={SKILL_DETAIL_COPY.pathCopyLabel}
              text={entry.repoRelativePath}
            />
          </Button>
        </div>
      </div>

      <div className="ui-border bg-card rounded-lg border p-6">
        {content.length > 0 ? (
          <MarkdownRenderer source={content} />
        ) : (
          <p className="text-muted-foreground text-sm">
            {SKILL_DETAIL_COPY.emptyContentNotice}
          </p>
        )}
      </div>
    </div>
  );
};
