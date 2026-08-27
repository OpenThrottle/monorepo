import * as React from 'react';
import clsx from 'clsx';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SkillUsageDailyChart } from '~/global/components/SkillUsageDailyChart';
import { SkillUsageLeaderboard } from '~/routing/usage/components/SkillUsageLeaderboard';
import { partitionSkillUsageByPresence } from '~/routing/usage/utils/partition-skill-usage-by-presence';
import { SKILLS_INDEX_USAGE_COPY } from '~/routing/skills/data/data.copy';
import { SKILL_USAGE_COPY } from '~/routing/usage/data/skill-usage-copy';
import type { SkillsIndexUsageData } from '~/routing/skills/data/skills-index-usage';

export interface SkillsIndexUsageProps {
  className?: string;
  /**
   * Slugs discovered on disk by the loader. Rows are classified against this
   * set, which decides both whether a row links through to its detail page and
   * which table it lands in.
   */
  presentSlugs: readonly string[];
  rangeDays: number;
  usage: SkillsIndexUsageData;
}

/**
 * @description Aggregate usage sections for the /skills index (all skills, last
 * 30 days): the shared "Usage over time" stacked chart and the "Top skills"
 * leaderboard. Reuses the same components as /usage. Degrades to an
 * informational notice when the query is unavailable (no settings:read / server
 * error) — never an error boundary.
 *
 * "Top skills" ranks only skills still present in this checkout. Rows with
 * recorded usage but no SKILL.md are real history, so they are kept — but in a
 * separate, de-emphasized section below, which does not render at all when
 * there are none. The empty message is keyed off the ranked bucket rather than
 * the raw row count, so an all-missing window explains itself instead of
 * rendering an empty table.
 */
export const SkillsIndexUsage = (
  props: SkillsIndexUsageProps,
): React.ReactElement => {
  const { className, presentSlugs, rangeDays, usage } = props;

  // Hooks

  // Setup
  const partitioned = React.useMemo(
    () =>
      partitionSkillUsageByPresence(
        usage.available ? usage.bySkill : [],
        new Set(presentSlugs),
      ),
    [presentSlugs, usage],
  );

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
      {partitioned.active.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="SkillsIndexUsageEmpty"
        >
          {SKILL_USAGE_COPY.empty}
        </p>
      ) : (
        <SkillUsageLeaderboard bySkill={partitioned.active} />
      )}

      {partitioned.missing.length > 0 ? (
        <div className="mt-8" data-testid="SkillsIndexUsageMissing">
          <GlobalHeading
            className="text-muted-foreground mb-2"
            heading="h3"
            title={SKILL_USAGE_COPY.missingHeading}
          />
          <p className="text-muted-foreground mb-3 text-sm">
            {SKILL_USAGE_COPY.missingIntro}
          </p>
          <SkillUsageLeaderboard bySkill={partitioned.missing} />
        </div>
      ) : null}
    </div>
  );
};
