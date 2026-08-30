import * as React from 'react';
import { DashboardDailyStatsCard } from '~/routing/dashboard/components/DashboardDailyStatsCard';
import {
  GetUsageBranchSearchDocument,
  GetUsageDailyStatsDocument,
  GetUsageSkillUsageDocument,
  GetUsageTokenUsageDocument,
} from '~/__generated__/graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { SITE_TITLE } from '~/global/config/settings';
import { UsageAnalyticsGaps } from '~/routing/usage/components/UsageAnalyticsGaps';
import { UsageDailyActivityOverview } from '~/routing/usage/components/UsageDailyActivityOverview';
import { UsageIntroduction } from '~/routing/usage/components/UsageIntroduction';
import { UsageOverview } from '~/routing/usage/components/UsageOverview';
import { UsageSkillUsage } from '~/routing/usage/components/UsageSkillUsage';
import { UsageSnapshot } from '~/routing/usage/components/UsageSnapshot';
import { UsageTokenUsage } from '~/routing/usage/components/UsageTokenUsage';
import { parseSkillScope } from '~/routing/usage/utils/parse-skill-scope';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/usage._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Usage',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  // Disk discovery is the exact gate `/skills/$slug` uses to 404 (see
  // `readSkillFileBySlug`): a Top-skills row links through only when its
  // `skillName` matches a discovered slug. Reuse it here rather than the
  // `projectSkills` query so links never depend on DB ingest/auth state.
  const { discoverRepoSkills } =
    await import('~/routing/agents/data/discover-repo-skills.server');
  const { getMonorepoRoot } =
    await import('~/routing/agents/data/resolve-monorepo-root.server');

  // Slugs actually present in this checkout. Leaderboard rows are classified
  // against this set: it decides both which rows link through to a detail page
  // and which ones are only history (mirrors /skills).
  const discoveredSkills = discoverRepoSkills(getMonorepoRoot());
  const presentSkillSlugs = discoveredSkills.map((entry) => entry.slug);
  // The subset linked in from outside the repo. Same derivation as /skills, so
  // one skill cannot read as two different things on the two routes.
  const personalSkillSlugs = discoveredSkills
    .filter((entry) => entry.isPersonal === true)
    .map((entry) => entry.slug);

  const searchParams = new URL(args.request.url).searchParams;
  const providerParam = searchParams.get('provider');
  const selectedProvider =
    providerParam !== null && providerParam !== '' ? providerParam : null;

  const selectedSkillScope = parseSkillScope(searchParams.get('skillScope'));
  const skillBranchParam = searchParams.get('skillBranch');
  const selectedSkillGitBranch =
    skillBranchParam !== null && skillBranchParam !== ''
      ? skillBranchParam
      : null;
  const skillCwdParam = searchParams.get('skillCwd');
  const selectedSkillCwd =
    skillCwdParam !== null && skillCwdParam !== '' ? skillCwdParam : null;

  const end = new Date();
  const endIso = end.toISOString();

  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();

  // tokenUsage / skillUsage filter on YYYY-MM-DD (see resolver contracts).
  const startDate = startIso.slice(0, 10);
  const endDate = endIso.slice(0, 10);

  const [dailyResult, tokenUsageResult, skillUsageResult, branchResult] =
    await Promise.all([
      executeGraphqlWithAuth(args.request, GetUsageDailyStatsDocument, {
        end: endIso,
        start: startIso,
      }),
      executeGraphqlWithAuth(args.request, GetUsageTokenUsageDocument, {
        end: endDate,
        provider: selectedProvider,
        start: startDate,
      }),
      executeGraphqlWithAuth(args.request, GetUsageSkillUsageDocument, {
        cwd: selectedSkillCwd,
        end: endDate,
        gitBranch: selectedSkillGitBranch,
        scope: selectedSkillScope,
        start: startDate,
      }),
      // First page of the branch dropdown, so SSR renders a populated,
      // correctly-ordered list without waiting on a client search.
      executeGraphqlWithAuth(args.request, GetUsageBranchSearchDocument, {
        end: endDate,
        limit: null,
        query: null,
        start: startDate,
      }),
    ]);

  const dailyStats: DashboardDailyStatsCardFragment[] =
    dailyResult.dailyStatsRange.items ?? [];

  return {
    branchOptions: branchResult.skillUsageGitBranches.items,
    branchesHaveMore: branchResult.skillUsageGitBranches.hasMore,
    dailyStats,
    personalSkillSlugs,
    presentSkillSlugs,
    rangeDays: 30,
    rangeEndDate: endDate,
    rangeEndIso: endIso,
    rangeStartDate: startDate,
    rangeStartIso: startIso,
    selectedProvider,
    selectedSkillCwd,
    selectedSkillGitBranch,
    selectedSkillScope,
    skillUsage: skillUsageResult.skillUsage,
    tokenUsageItems: tokenUsageResult.tokenUsage.items,
    tokenUsageTotals: tokenUsageResult.tokenUsage.totals,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Usage | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const {
    branchOptions,
    branchesHaveMore,
    dailyStats,
    personalSkillSlugs,
    presentSkillSlugs,
    rangeDays,
    rangeEndDate,
    rangeEndIso,
    rangeStartDate,
    rangeStartIso,
    selectedProvider,
    selectedSkillCwd,
    selectedSkillGitBranch,
    selectedSkillScope,
    skillUsage,
    tokenUsageItems,
    tokenUsageTotals,
  } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <UsageIntroduction rangeDays={rangeDays} />
      <UsageOverview rangeDays={rangeDays} />
      <UsageTokenUsage
        items={tokenUsageItems}
        rangeDays={rangeDays}
        selectedProvider={selectedProvider}
        skillCwdParam={selectedSkillCwd}
        skillGitBranchParam={selectedSkillGitBranch}
        skillScopeParam={selectedSkillScope}
        totals={tokenUsageTotals}
      />
      <UsageSkillUsage
        branchOptions={branchOptions}
        branchesHaveMore={branchesHaveMore}
        byDay={skillUsage.byDay}
        byScope={skillUsage.byScope}
        bySkill={skillUsage.bySkill}
        end={rangeEndDate}
        filterOptions={skillUsage.filterOptions}
        personalSlugs={personalSkillSlugs}
        presentSlugs={presentSkillSlugs}
        providerParam={selectedProvider}
        rangeDays={rangeDays}
        selectedCwd={selectedSkillCwd}
        selectedGitBranch={selectedSkillGitBranch}
        selectedScope={selectedSkillScope}
        start={rangeStartDate}
        totalCount={skillUsage.totalCount}
      />
      <div data-testid="UsageDailyActivity">
        <DashboardDailyStatsCard className="my-4" dailyStats={dailyStats} />
      </div>
      <UsageDailyActivityOverview rangeDays={rangeDays} />
      <UsageAnalyticsGaps />
      <UsageSnapshot
        dailyStats={dailyStats}
        rangeDays={rangeDays}
        rangeEndIso={rangeEndIso}
        rangeStartIso={rangeStartIso}
      />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
