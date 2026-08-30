import * as React from 'react';
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import { SKILLS_SOURCE_COPY } from '~/routing/skills/data/data.copy';
import type { ModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';

export interface SkillIntroductionBadgesProps {
  readonly entry: RepoSkillEntry;
  readonly invocationBadge: ModelInvocationBadge;
  readonly isOpenThrottle: boolean;
  /** True when the tag chips aren't owning tag display, so tags render read-only. */
  readonly showReadOnlyTags: boolean;
  readonly sourceTooltip: string;
}

/**
 * @description Provenance, model-invocation, and read-only tag badges for the
 * skill detail introduction. An external skill's source badge links out to its
 * origin when the entry carries a `sourceUrl`; a personal-tier skill reads
 * "Personal" and never links out, because its origin is a directory on this
 * machine that no URL describes. Split out of SkillIntroduction
 * (component-primitive-shape R6). DISPLAY ONLY — no write affordances live here.
 */
export const SkillIntroductionBadges = (
  props: SkillIntroductionBadgesProps,
): React.ReactElement => {
  const {
    entry,
    invocationBadge,
    isOpenThrottle,
    showReadOnlyTags,
    sourceTooltip,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Setup — the personal tier outranks the source label: a skill from your own
  // directory is not an External install, and saying so is the whole point.
  const isPersonal = entry.isPersonal === true;

  const sourceLabel = isPersonal
    ? SKILLS_SOURCE_COPY.personalLabel
    : isOpenThrottle
      ? SKILLS_SOURCE_COPY.openthrottleLabel
      : SKILLS_SOURCE_COPY.externalLabel;

  // Markup
  const sourceBadge = (
    <Badge
      color={isPersonal ? 'amber' : isOpenThrottle ? 'violet' : 'slate'}
      data-testid="skill-source-badge"
      size="xs"
    >
      {sourceLabel}
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <React.Fragment>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          {!isOpenThrottle && !isPersonal && entry.sourceUrl ? (
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
          {isPersonal ? SKILLS_SOURCE_COPY.personalTooltip : sourceTooltip}
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

      {showReadOnlyTags
        ? (entry.tags ?? []).map((tag) => (
            <Badge color="blue" key={tag} size="xs">
              {tag}
            </Badge>
          ))
        : null}
    </React.Fragment>
  );
};
