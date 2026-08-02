import * as React from 'react';
import { DashboardDailyStatsCard } from '~/routing/dashboard/components/DashboardDailyStatsCard';
import {
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
import {
  SKILL_USAGE_SCOPES,
  type SkillUsageScopeFilter,
} from '~/routing/usage/data/skill-usage-copy';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';
import type { Route } from '@/app/routes/+types/usage._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Usage',
  links: (_match) => [],
};

const parseSkillScope = (raw: string | null): SkillUsageScopeFilter => {
  if (
    raw === SKILL_USAGE_SCOPES.OURS ||
    raw === SKILL_USAGE_SCOPES.THIRD_PARTY
  ) {
    return raw;
  }
  return null;
};

export const loader = async (args: Route.LoaderArgs) => {
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

  const [dailyResult, tokenUsageResult, skillUsageResult] = await Promise.all([
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
  ]);

  const dailyStats: DashboardDailyStatsCardFragment[] =
    dailyResult.dailyStatsRange.items ?? [];

  return {
    dailyStats,
    rangeDays: 30,
    rangeEndIso: endIso,
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
    dailyStats,
    rangeDays,
    rangeEndIso,
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
        byDay={skillUsage.byDay}
        byScope={skillUsage.byScope}
        bySkill={skillUsage.bySkill}
        filterOptions={skillUsage.filterOptions}
        providerParam={selectedProvider}
        rangeDays={rangeDays}
        selectedCwd={selectedSkillCwd}
        selectedGitBranch={selectedSkillGitBranch}
        selectedScope={selectedSkillScope}
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
