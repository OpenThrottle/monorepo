import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { BrainCircuitIcon } from 'lucide-react';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/usage.skills';
import {
  GetUsageBranchSearchDocument,
  GetUsageSkillUsageDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { UsagePageIntroduction } from '~/routing/usage/components/UsagePageIntroduction';
import { UsageSkillUsage } from '~/routing/usage/components/UsageSkillUsage';
import { SKILL_USAGE_COPY } from '~/routing/usage/data/data.skill-usage-copy';
import { getUsageRange } from '~/routing/usage/utils/getUsageRange';
import { parseSkillScope } from '~/routing/usage/utils/parseSkillScope';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Skills usage',
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
  // Skills that declare `metadata.outcome-telemetry: 'none'`: their empty
  // Outcomes / Avg duration cells read "Not reported by design".
  const optedOutSkillSlugs = discoveredSkills
    .filter((entry) => entry.outcomeTelemetry === 'none')
    .map((entry) => entry.slug);

  const searchParams = new URL(args.request.url).searchParams;
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

  const { endDate, rangeDays, startDate } = getUsageRange();

  const [skillUsageResult, branchResult] = await Promise.all([
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
  ]);

  return {
    branchOptions: branchResult.skillUsageGitBranches.items,
    branchesHaveMore: branchResult.skillUsageGitBranches.hasMore,
    optedOutSkillSlugs,
    presentSkillSlugs,
    rangeDays,
    rangeEndDate: endDate,
    rangeStartDate: startDate,
    selectedSkillCwd,
    selectedSkillGitBranch,
    selectedSkillRepo,
    selectedSkillScope,
    skillUsage: skillUsageResult.skillUsage,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Skills usage | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const {
    branchOptions,
    branchesHaveMore,
    optedOutSkillSlugs,
    presentSkillSlugs,
    rangeDays,
    rangeEndDate,
    rangeStartDate,
    selectedSkillCwd,
    selectedSkillGitBranch,
    selectedSkillRepo,
    selectedSkillScope,
    skillUsage,
  } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <UsagePageIntroduction
        icon={BrainCircuitIcon}
        title={SKILL_USAGE_COPY.heading}
      >
        {SKILL_USAGE_COPY.intro(rangeDays)}
      </UsagePageIntroduction>
      <UsageSkillUsage
        branchOptions={branchOptions}
        branchesHaveMore={branchesHaveMore}
        byDay={skillUsage.byDay}
        byScope={skillUsage.byScope}
        bySkill={skillUsage.bySkill}
        end={rangeEndDate}
        filterOptions={skillUsage.filterOptions}
        optedOutSlugs={optedOutSkillSlugs}
        presentSlugs={presentSkillSlugs}
        selectedCwd={selectedSkillCwd}
        selectedGitBranch={selectedSkillGitBranch}
        selectedRepo={selectedSkillRepo}
        selectedScope={selectedSkillScope}
        start={rangeStartDate}
        totalCount={skillUsage.totalCount}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
