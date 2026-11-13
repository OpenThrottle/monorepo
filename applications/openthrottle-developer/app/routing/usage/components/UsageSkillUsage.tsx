import { cn } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import * as React from 'react';

import type {
  UsageSkillUsageByDayFragment,
  UsageSkillUsageByScopeFragment,
  UsageSkillUsageBySkillFragment,
  UsageSkillUsageFilterOptionsFragment,
} from '~/__generated__/graphql';
import { SkillUsageDailyChart } from '~/global/components/SkillUsageDailyChart';
import { SkillUsageLeaderboard } from '~/routing/usage/components/SkillUsageLeaderboard';
import { UsageSkillUsageFilters } from '~/routing/usage/components/UsageSkillUsageFilters';
import { UsageSkillUsageSummary } from '~/routing/usage/components/UsageSkillUsageSummary';
import {
  SKILL_USAGE_COPY,
  type SkillUsageScopeFilter,
} from '~/routing/usage/data/data.skill-usage-copy';
import type { UsageBranchOption } from '~/routing/usage/types';
import { partitionSkillUsageByPresence } from '~/routing/usage/utils/partitionSkillUsageByPresence';

export interface UsageSkillUsageProps {
  /** Current `?provider=` (token usage); preserved when skill filters change. */
  /** `?account=` token-usage filter to preserve, or null. */
  accountParam?: string | null;
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
  presentSlugs: readonly string[];
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
    presentSlugs,
    accountParam = null,
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
    () => partitionSkillUsageByPresence(bySkill, new Set(presentSlugs)),
    [bySkill, presentSlugs],
  );
  const hasFilters =
    selectedScope != null || selectedGitBranch != null || selectedCwd != null;
  // Keyed off the ranked bucket, not the raw row count: a scope/branch/cwd
  // filter can legitimately narrow the window down to nothing but missing rows,
  // and that must still explain itself rather than leave a bare heading over an
  // empty table.
  const { empty, emptyFiltered } = SKILL_USAGE_COPY;
  const emptyMessage = hasFilters ? emptyFiltered : empty;
  const hasActiveRows = partitioned.active.length > 0;
  const hasMissingRows = partitioned.missing.length > 0;

  // Handlers

  // Markup
  const emptyLeaderboard = (
    <p
      className="text-muted-foreground text-sm"
      data-testid="UsageSkillUsageEmpty"
    >
      {emptyMessage}
    </p>
  );
  const activeLeaderboard = (
    <SkillUsageLeaderboard bySkill={partitioned.active} />
  );
  const missingSection = (
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
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn('mt-8', className)} data-testid="UsageSkillUsage">
      <GlobalHeading
        className="mb-4"
        heading="h2"
        title={SKILL_USAGE_COPY.heading}
      />
      <p className="text-muted-foreground mb-4 text-sm md:mb-6">
        {SKILL_USAGE_COPY.intro(rangeDays)}
      </p>

      <UsageSkillUsageFilters
        accountParam={accountParam}
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
      {hasActiveRows ? activeLeaderboard : emptyLeaderboard}

      {hasMissingRows ? missingSection : null}
    </div>
  );
};
