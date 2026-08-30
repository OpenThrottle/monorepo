import * as React from 'react';
import clsx from 'clsx';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SkillUsageDailyChart } from '~/global/components/SkillUsageDailyChart';
import { SkillUsageLeaderboard } from '~/routing/usage/components/SkillUsageLeaderboard';
import { UsageSkillUsageFilters } from '~/routing/usage/components/UsageSkillUsageFilters';
import { UsageSkillUsageSummary } from '~/routing/usage/components/UsageSkillUsageSummary';
import { partitionSkillUsageByPresence } from '~/routing/usage/utils/partition-skill-usage-by-presence';
import {
  SKILL_USAGE_COPY,
  type SkillUsageScopeFilter,
} from '~/routing/usage/data/skill-usage-copy';
import type { UsageBranchOption } from '~/routing/usage/hooks/useUsageBranchSearch';
import type {
  UsageSkillUsageByDayFragment,
  UsageSkillUsageByScopeFragment,
  UsageSkillUsageBySkillFragment,
  UsageSkillUsageFilterOptionsFragment,
} from '~/__generated__/graphql';

export interface UsageSkillUsageProps {
  /** SSR first page of branches: default branch first, then A–Z. */
  branchOptions: readonly UsageBranchOption[];
  /** The SSR branch page was truncated, so the list is not exhaustive. */
  branchesHaveMore: boolean;
  byDay: readonly UsageSkillUsageByDayFragment[];
  byScope: readonly UsageSkillUsageByScopeFragment[];
  bySkill: readonly UsageSkillUsageBySkillFragment[];
  className?: string;
  /** Range end (YYYY-MM-DD) the branch search runs over. */
  end: string;
  filterOptions: UsageSkillUsageFilterOptionsFragment;
  /**
   * Slugs discovered on disk by the loader. Rows are classified against this
   * set, which decides both whether a row links through to its detail page and
   * which table it lands in.
   */
  personalSlugs?: readonly string[];
  presentSlugs: readonly string[];
  /** Current `?provider=` (token usage); preserved when skill filters change. */
  providerParam: string | null;
  rangeDays: number;
  selectedCwd: string | null;
  selectedGitBranch: string | null;
  selectedScope: SkillUsageScopeFilter;
  /** Range start (YYYY-MM-DD) the branch search runs over. */
  start: string;
  totalCount: number;
}

export const UsageSkillUsage = (
  props: UsageSkillUsageProps,
): React.ReactElement => {
  const {
    branchOptions,
    branchesHaveMore,
    byDay,
    byScope,
    bySkill,
    className,
    end,
    filterOptions,
    personalSlugs,
    presentSlugs,
    providerParam,
    rangeDays,
    selectedCwd,
    selectedGitBranch,
    selectedScope,
    start,
    totalCount,
  } = props;

  // Hooks

  // Setup
  const partitioned = React.useMemo(
    () =>
      partitionSkillUsageByPresence(
        bySkill,
        new Set(presentSlugs),
        new Set(personalSlugs ?? []),
      ),
    [bySkill, personalSlugs, presentSlugs],
  );
  const hasFilters =
    selectedScope != null || selectedGitBranch != null || selectedCwd != null;
  // Keyed off the ranked bucket, not the raw row count: a scope/branch/cwd
  // filter can legitimately narrow the window down to nothing but missing rows,
  // and that must still explain itself rather than leave a bare heading over an
  // empty table.
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
        branchOptions={branchOptions}
        branchesHaveMore={branchesHaveMore}
        end={end}
        filterOptions={filterOptions}
        providerParam={providerParam}
        selectedCwd={selectedCwd}
        selectedGitBranch={selectedGitBranch}
        selectedScope={selectedScope}
        start={start}
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
      {partitioned.active.length === 0 ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="UsageSkillUsageEmpty"
        >
          {emptyMessage}
        </p>
      ) : (
        <SkillUsageLeaderboard bySkill={partitioned.active} />
      )}

      {partitioned.missing.length > 0 ? (
        <div className="mt-8" data-testid="UsageSkillUsageMissing">
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
