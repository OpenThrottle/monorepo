import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/usage._index';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import {
  GetUsageBranchSearchDocument,
  GetUsageCaptureHealthDocument,
  GetUsageDailyStatsDocument,
  GetUsageSkillUsageDocument,
  GetUsageTokenUsageDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { DashboardDailyStatsCard } from '~/routing/dashboard/components/DashboardDailyStatsCard';
import { UsageAnalyticsGaps } from '~/routing/usage/components/UsageAnalyticsGaps';
import { UsageCaptureHealth } from '~/routing/usage/components/UsageCaptureHealth';
import { UsageDailyActivityOverview } from '~/routing/usage/components/UsageDailyActivityOverview';
import { UsageIntroduction } from '~/routing/usage/components/UsageIntroduction';
import { UsageOverview } from '~/routing/usage/components/UsageOverview';
import { UsageSkillUsage } from '~/routing/usage/components/UsageSkillUsage';
import { UsageSnapshot } from '~/routing/usage/components/UsageSnapshot';
import { UsageTelemetryCoverage } from '~/routing/usage/components/UsageTelemetryCoverage';
import { UsageTokenUsage } from '~/routing/usage/components/UsageTokenUsage';
import { fetchTelemetryCoverage } from '~/routing/usage/utils/fetchTelemetryCoverage';
import { forgetTelemetryMachine } from '~/routing/usage/utils/forgetTelemetryMachine';
import { parseSkillScope } from '~/routing/usage/utils/parseSkillScope';

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
    await import('~/routing/agents/utils/discoverRepoSkills.server');
  const { getMonorepoRoot } =
    await import('~/routing/agents/utils/resolve-monorepo-root.server');

  // Slugs actually present in this checkout. Leaderboard rows are classified
  // against this set: it decides both which rows link through to a detail page
  // and which ones are only history (mirrors /skills).
  const discoveredSkills = discoverRepoSkills(getMonorepoRoot());
  const presentSkillSlugs = discoveredSkills.map((entry) => entry.slug);

  const searchParams = new URL(args.request.url).searchParams;
  const providerParam = searchParams.get('provider');
  const selectedProvider =
    providerParam !== null && providerParam !== '' ? providerParam : null;

  const accountParam = searchParams.get('account');
  const selectedAccount =
    accountParam !== null && accountParam !== '' ? accountParam : null;

  const selectedSkillScope = parseSkillScope(searchParams.get('skillScope'));
  const skillBranchParam = searchParams.get('skillBranch');
  const hasSkillBranch = skillBranchParam !== null && skillBranchParam !== '';
  const selectedSkillGitBranch = hasSkillBranch ? skillBranchParam : null;
  const skillCwdParam = searchParams.get('skillCwd');
  const selectedSkillCwd =
    skillCwdParam !== null && skillCwdParam !== '' ? skillCwdParam : null;
  const skillRepoParam = searchParams.get('skillRepo');
  const selectedSkillRepo =
    skillRepoParam !== null && skillRepoParam !== '' ? skillRepoParam : null;

  const end = new Date();
  const endIso = end.toISOString();

  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startIso = start.toISOString();

  // tokenUsage / skillUsage filter on YYYY-MM-DD (see resolver contracts).
  const startDate = startIso.slice(0, 10);
  const endDate = endIso.slice(0, 10);

  const [
    dailyResult,
    tokenUsageResult,
    skillUsageResult,
    branchResult,
    captureHealthResult,
    telemetryCoverage,
  ] = await Promise.all([
    executeGraphqlWithAuth(args.request, GetUsageDailyStatsDocument, {
      end: endIso,
      start: startIso,
    }),
    executeGraphqlWithAuth(args.request, GetUsageTokenUsageDocument, {
      accountId: selectedAccount,
      end: endDate,
      provider: selectedProvider,
      start: startDate,
    }),
    executeGraphqlWithAuth(args.request, GetUsageSkillUsageDocument, {
      cwd: selectedSkillCwd,
      end: endDate,
      gitBranch: selectedSkillGitBranch,
      repoIdentity: selectedSkillRepo,
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
    // Per-source "last captured" signal: a silent capture outage looks
    // identical to a quiet week in the charts above.
    executeGraphqlWithAuth(args.request, GetUsageCaptureHealthDocument, {}),
    // Which machines report and through which delivery leg. Resolves to null
    // on failure so a coverage outage never blanks the rest of the page.
    fetchTelemetryCoverage(args.request),
  ]);

  const dailyStats: DashboardDailyStatsCardFragment[] =
    dailyResult.dailyStatsRange.items ?? [];

  return {
    branchOptions: branchResult.skillUsageGitBranches.items,
    branchesHaveMore: branchResult.skillUsageGitBranches.hasMore,
    captureHealth: captureHealthResult.captureHealth,
    dailyStats,
    presentSkillSlugs,
    rangeDays: 30,
    rangeEndDate: endDate,
    rangeEndIso: endIso,
    rangeStartDate: startDate,
    rangeStartIso: startIso,
    selectedAccount,
    selectedProvider,
    selectedSkillCwd,
    selectedSkillGitBranch,
    selectedSkillRepo,
    selectedSkillScope,
    skillUsage: skillUsageResult.skillUsage,
    telemetryCoverage,
    tokenUsageByAccount: tokenUsageResult.tokenUsage.byAccount,
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
    captureHealth,
    dailyStats,
    presentSkillSlugs,
    rangeDays,
    rangeEndDate,
    rangeEndIso,
    rangeStartDate,
    rangeStartIso,
    selectedAccount,
    selectedProvider,
    selectedSkillCwd,
    selectedSkillGitBranch,
    selectedSkillRepo,
    selectedSkillScope,
    skillUsage,
    telemetryCoverage,
    tokenUsageByAccount,
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
      <UsageCaptureHealth nowIso={rangeEndIso} rows={captureHealth} />
      <UsageTelemetryCoverage
        coverage={telemetryCoverage}
        nowIso={rangeEndIso}
      />
      <UsageTokenUsage
        byAccount={tokenUsageByAccount}
        items={tokenUsageItems}
        rangeDays={rangeDays}
        selectedAccount={selectedAccount}
        selectedProvider={selectedProvider}
        skillCwdParam={selectedSkillCwd}
        skillGitBranchParam={selectedSkillGitBranch}
        skillRepoParam={selectedSkillRepo}
        skillScopeParam={selectedSkillScope}
        totals={tokenUsageTotals}
      />
      <UsageSkillUsage
        accountParam={selectedAccount}
        branchOptions={branchOptions}
        branchesHaveMore={branchesHaveMore}
        byDay={skillUsage.byDay}
        byScope={skillUsage.byScope}
        bySkill={skillUsage.bySkill}
        end={rangeEndDate}
        filterOptions={skillUsage.filterOptions}
        presentSlugs={presentSkillSlugs}
        providerParam={selectedProvider}
        rangeDays={rangeDays}
        selectedCwd={selectedSkillCwd}
        selectedGitBranch={selectedSkillGitBranch}
        selectedRepo={selectedSkillRepo}
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

export const action = async (args: Route.ActionArgs) => {
  return forgetTelemetryMachine(args.request);
};

export const ErrorBoundary = GlobalErrorBoundary;
