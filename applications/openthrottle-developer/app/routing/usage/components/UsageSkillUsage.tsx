import * as React from 'react';
import clsx from 'clsx';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SkillUsageDailyChart } from '~/global/components/SkillUsageDailyChart';
import { SkillUsageLeaderboard } from '~/routing/usage/components/SkillUsageLeaderboard';
import { UsageSkillUsageFilters } from '~/routing/usage/components/UsageSkillUsageFilters';
import { UsageSkillUsageSummary } from '~/routing/usage/components/UsageSkillUsageSummary';
import {
  SKILL_USAGE_COPY,
  type SkillUsageScopeFilter,
} from '~/routing/usage/data/skill-usage-copy';
import type {
  UsageSkillUsageByDayFragment,
  UsageSkillUsageByScopeFragment,
  UsageSkillUsageBySkillFragment,
  UsageSkillUsageFilterOptionsFragment,
} from '~/__generated__/graphql';

export interface UsageSkillUsageProps {
  byDay: readonly UsageSkillUsageByDayFragment[];
  byScope: readonly UsageSkillUsageByScopeFragment[];
  bySkill: readonly UsageSkillUsageBySkillFragment[];
  className?: string;
  filterOptions: UsageSkillUsageFilterOptionsFragment;
  /**
   * Skill names that resolve to an on-disk `/skills/$slug` detail page. A row is
   * rendered as a link only when its `skillName` is in this set — third-party /
   * plugin-namespaced ids with no on-disk skill stay plain text (no 404 links).
   */
  linkableSlugs: readonly string[];
  /** Current `?provider=` (token usage); preserved when skill filters change. */
  providerParam: string | null;
  rangeDays: number;
  selectedCwd: string | null;
  selectedGitBranch: string | null;
  selectedScope: SkillUsageScopeFilter;
  totalCount: number;
}

export const UsageSkillUsage = (
  props: UsageSkillUsageProps,
): React.ReactElement => {
  const {
    byDay,
    byScope,
    bySkill,
    className,
    filterOptions,
    linkableSlugs,
    providerParam,
    rangeDays,
    selectedCwd,
    selectedGitBranch,
    selectedScope,
    totalCount,
  } = props;

  // Hooks

  // Setup
  const linkableSlugSet = React.useMemo(
    () => new Set(linkableSlugs),
    [linkableSlugs],
  );
  const hasFilters =
    selectedScope != null || selectedGitBranch != null || selectedCwd != null;
  const emptyMessage = hasFilters
    ? SKILL_USAGE_COPY.emptyFiltered
    : SKILL_USAGE_COPY.empty;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('mt-8', className)} data-testid="UsageSkillUsage">
      <GlobalHeading
        className="mb-4"
        heading="h2"
        title={SKILL_USAGE_COPY.heading}
      />
      <p className="text-muted-foreground mb-4 text-sm md:mb-6">
        {SKILL_USAGE_COPY.intro(rangeDays)}
      </p>

      <UsageSkillUsageFilters
        filterOptions={filterOptions}
        providerParam={providerParam}
        selectedCwd={selectedCwd}
        selectedGitBranch={selectedGitBranch}
        selectedScope={selectedScope}
      />

      <UsageSkillUsageSummary byScope={byScope} totalCount={totalCount} />

      <GlobalHeading
        className="mb-3"
        heading="h3"
        title={SKILL_USAGE_COPY.overTimeHeading}
      />
      <SkillUsageDailyChart className="mb-8" data={byDay} />

      <GlobalHeading
        className="mb-3"
        heading="h3"
        title={SKILL_USAGE_COPY.leaderboardHeading}
      />
      {bySkill.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="UsageSkillUsageEmpty"
        >
          {emptyMessage}
        </p>
      ) : (
        <SkillUsageLeaderboard
          bySkill={bySkill}
          linkableSlugs={linkableSlugSet}
        />
      )}
    </div>
  );
};
