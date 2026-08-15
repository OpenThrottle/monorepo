import * as React from 'react';
import clsx from 'clsx';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SkillUsageDailyChart } from '~/global/components/SkillUsageDailyChart';
import { SkillUsageLeaderboard } from '~/routing/usage/components/SkillUsageLeaderboard';
import { SKILLS_INDEX_USAGE_COPY } from '~/routing/skills/data/data.copy';
import { SKILL_USAGE_COPY } from '~/routing/usage/data/skill-usage-copy';
import type { SkillsIndexUsageData } from '~/routing/skills/data/skills-index-usage';

export interface SkillsIndexUsageProps {
  className?: string;
  /**
   * Skill names that resolve to an on-disk `/skills/$slug` detail page —
   * derived from the loader's disk entries so leaderboard rows link only when
   * the row's `skillName` matches a discovered slug.
   */
  linkableSlugs: readonly string[];
  rangeDays: number;
  usage: SkillsIndexUsageData;
}

/**
 * @description Aggregate usage sections for the /skills index (all skills, last
 * 30 days): the shared "Usage over time" stacked chart and the "Top skills"
 * leaderboard. Reuses the same components as /usage. Degrades to an
 * informational notice when the query is unavailable (no settings:read / server
 * error) — never an error boundary.
 */
export const SkillsIndexUsage = (
  props: SkillsIndexUsageProps,
): React.ReactElement => {
  const { className, linkableSlugs, rangeDays, usage } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const header = (
    <>
      <GlobalHeading
        className="mb-4"
        heading="h2"
        title={SKILLS_INDEX_USAGE_COPY.sectionHeading}
      />
      <p className="text-muted-foreground mb-4 text-sm md:mb-6">
        {SKILLS_INDEX_USAGE_COPY.intro(rangeDays)}
      </p>
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (!usage.available) {
    return (
      <div className={clsx('mt-8', className)} data-testid="SkillsIndexUsage">
        {header}
        <p
          className="text-muted-foreground text-sm"
          data-testid="SkillsIndexUsageUnavailable"
        >
          {SKILLS_INDEX_USAGE_COPY.unavailableNotice}
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('mt-8', className)} data-testid="SkillsIndexUsage">
      {header}

      <GlobalHeading
        className="mb-3"
        heading="h3"
        title={SKILL_USAGE_COPY.overTimeHeading}
      />
      <SkillUsageDailyChart className="mb-8" data={usage.byDay} />

      <GlobalHeading
        className="mb-3"
        heading="h3"
        title={SKILL_USAGE_COPY.leaderboardHeading}
      />
      {usage.bySkill.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="SkillsIndexUsageEmpty"
        >
          {SKILL_USAGE_COPY.empty}
        </p>
      ) : (
        <SkillUsageLeaderboard
          bySkill={usage.bySkill}
          linkableSlugs={linkableSlugs}
        />
      )}
    </div>
  );
};
