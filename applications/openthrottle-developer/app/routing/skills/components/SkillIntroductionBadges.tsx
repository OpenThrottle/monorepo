import * as React from 'react';
import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import type { RepoSkillEntry } from '~/routing/agents/data/repo-skills-registry';
import type { ModelInvocationBadge } from '~/routing/skills/utils/model-invocation-badge';
import { getSkillSourceBadge } from '~/routing/skills/utils/source-badge';

export interface SkillIntroductionBadgesProps {
  readonly entry: RepoSkillEntry;
  readonly invocationBadge: ModelInvocationBadge;
  /** True when the tag chips aren't owning tag display, so tags render read-only. */
  readonly showReadOnlyTags: boolean;
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
  const { entry, invocationBadge, showReadOnlyTags } = props;

  // Hooks

  // Setup
  const source = getSkillSourceBadge(entry);

  // Handlers

  // Markup
  const sourceBadge = (
    <Badge color={source.color} data-testid="skill-source-badge" size="xs">
      {source.label}
    </Badge>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <React.Fragment>
      <Tooltip>
        <TooltipTrigger asChild={true}>
          {source.href ? (
            <a
              data-testid="skill-source-link"
              href={source.href}
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
          {source.tooltip}
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
