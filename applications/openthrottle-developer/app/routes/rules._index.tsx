import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalFeatureOnboarding,
  GlobalFeatureOnboardingModal,
  GlobalScreen,
  GlobalStatsPanel,
  ROUTE_STATS_URL,
  shouldRevalidateIgnoringParams,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { useFetcher, useSearchParams } from 'react-router';

import type { Route } from '@/app/routes/+types/rules._index';
import type { TagActionRuleRowFragment } from '~/__generated__/graphql';
import { RulesIndexLoaderDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { RulesIntroduction } from '~/routing/rules/components/RulesIntroduction';
import { RulesStats } from '~/routing/rules/components/RulesStats';
import { RulesTable } from '~/routing/rules/components/RulesTable';
import { RulesToolbar } from '~/routing/rules/components/RulesToolbar';
import { RULES_COPY, RULES_ONBOARDING } from '~/routing/rules/data/data.copy';
import { attachRuleSpecificity } from '~/routing/rules/utils/attachRuleSpecificity.server';
import {
  filterRulesList,
  parseRulesEnabledFilterFromSearchParams,
  parseRulesScopeFromSearchParams,
  parseRulesSearchFromSearchParams,
  RULES_SCOPE_ALL,
} from '~/routing/rules/utils/parsers';
import { countRulesByScope } from '~/routing/rules/utils/rule-groups';
import { RulesActionFormSchema } from '~/routing/rules/utils/RulesActionFormSchema';
import { runRulesAction } from '~/routing/rules/utils/runRulesAction.server';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: () => 'Rules',
};

export const loader = async (args: Route.LoaderArgs) => {
  const page = await executeGraphqlWithAuth(
    args.request,
    RulesIndexLoaderDocument,
    {},
  );

  return {
    repositories: page.workspaceRepositories ?? [],
    rules: attachRuleSpecificity(page.tagActionRules ?? []),
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta(() => [
  { title: `${RULES_COPY.pageTitle} | ${SITE_TITLE}` },
]);

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { repositories, rules } = loaderData;

  // Hooks
  const fetcher = useFetcher<typeof action>();
  const [searchParams] = useSearchParams();

  // Setup
  const enabledFilter = parseRulesEnabledFilterFromSearchParams(searchParams);
  const scope = parseRulesScopeFromSearchParams(searchParams);
  const search = parseRulesSearchFromSearchParams(searchParams);
  const isFiltered =
    search.trim().length > 0 ||
    enabledFilter !== 'all' ||
    scope !== RULES_SCOPE_ALL;
  const filteredRules = filterRulesList(rules, {
    enabledFilter,
    scope,
    search,
  });
  const scopeCounts = countRulesByScope(rules);
  const pending = fetcher.state !== 'idle';
  const fetcherData = fetcher.data;
  const hasRuleError = fetcherData != null && 'ruleError' in fetcherData;
  const ruleError = hasRuleError ? fetcherData.ruleError : null;
  const totalCount = rules.length;
  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const disabledCount = totalCount - enabledCount;
  // A genuinely-new user has zero rules and no active filter — show the rich
  // onboarding pitch instead of the toolbar/table. A zero-result *filtered*
  // search still falls through to RulesTable -> RulesEmpty (clear-filters CTA).
  const isNewUser = totalCount === 0 && !isFiltered;

  // Handlers
  const handleToggleEnabled = (rule: TagActionRuleRowFragment): void => {
    fetcher.submit(
      { intent: 'toggleEnabled', rule: JSON.stringify(rule) },
      { method: 'post' },
    );
  };

  // Markup
  const onboarding = <GlobalFeatureOnboarding content={RULES_ONBOARDING} />;
  const errorAlert = (
    <p className="text-destructive text-sm" role="alert">
      {ruleError}
    </p>
  );
  const rulesListing = (
    <>
      <GlobalStatsPanel>
        <RulesStats
          disabledCount={disabledCount}
          enabledCount={enabledCount}
          globalCount={scopeCounts.global}
          repositoryCount={scopeCounts.repository}
          totalCount={totalCount}
        />
      </GlobalStatsPanel>

      {ruleError != null ? errorAlert : null}

      <div className="flex flex-col gap-4">
        <RulesToolbar repositories={repositories} />
        <RulesTable
          isFiltered={isFiltered}
          onToggleEnabled={handleToggleEnabled}
          pending={pending}
          repositories={repositories}
          rules={filteredRules}
        />
      </div>
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <GlobalScreen>
        <RulesIntroduction />

        {isNewUser ? onboarding : rulesListing}
      </GlobalScreen>

      <GlobalFeatureOnboardingModal content={RULES_ONBOARDING} />
    </>
  );
}

export const shouldRevalidate = shouldRevalidateIgnoringParams([
  ROUTE_STATS_URL.param,
]);

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const parsed = parseFormData(formData, RulesActionFormSchema, {
    allow: [],
  });
  if (!parsed.success) {
    return { ruleError: parsed.error };
  }

  return runRulesAction(args.request, parsed.data);
};

export const ErrorBoundary = GlobalErrorBoundary;
