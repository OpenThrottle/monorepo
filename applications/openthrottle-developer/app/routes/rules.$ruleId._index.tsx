import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import { redirect, useFetcher } from 'react-router';

import type { Route } from '@/app/routes/+types/rules.$ruleId._index';
import type { TagActionRuleRowFragment } from '~/__generated__/graphql';
import { RuleDetailLoaderDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { RuleApplicationsSection } from '~/routing/rules/components/RuleApplicationsSection';
import { RuleDetailHeader } from '~/routing/rules/components/RuleDetailHeader';
import { RulePreviewSection } from '~/routing/rules/components/RulePreviewSection';
import { RULE_PREVIEW_ENVIRONMENT_PARAM } from '~/routing/rules/config/rule-preview';
import {
  RULE_DETAIL_COPY,
  RULES_NOT_FOUND_COPY,
} from '~/routing/rules/data/data.copy';
import { loadRulePreviewForRule } from '~/routing/rules/utils/rule-preview.server';
import { parseRulePreviewEnvironment } from '~/routing/rules/utils/rule-preview-params';
import { RulesActionFormSchema } from '~/routing/rules/utils/RulesActionFormSchema';
import { runRulesAction } from '~/routing/rules/utils/runRulesAction.server';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.rule?.title ?? 'Rule',
  links: (_match) => [{ children: 'Rules', to: '/rules' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { ruleId } = args.params;
  if (ruleId == null || ruleId === '') {
    return { applications: [], preview: null, repositories: [], rule: null };
  }

  const page = await executeGraphqlWithAuth(
    args.request,
    RuleDetailLoaderDocument,
    { id: ruleId },
  );

  const rule = page.tagActionRule ?? null;
  const evaluateEnvironment = parseRulePreviewEnvironment(
    new URL(args.request.url).searchParams.get(RULE_PREVIEW_ENVIRONMENT_PARAM),
  );
  // A dry run of the stored rule against the caller's plans, in the environment
  // the URL names (none by default, which is what the worker evaluates today).
  const preview = await loadRulePreviewForRule(
    args.request,
    rule,
    evaluateEnvironment,
  );

  return {
    applications: page.ruleApplicationsForRule,
    preview,
    repositories: page.workspaceRepositories,
    rule,
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const title = args.loaderData?.rule?.title;
  return [{ title: `${title ?? 'Rule'} | Rules | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { applications, preview, repositories, rule } = loaderData;

  // Hooks
  const fetcher = useFetcher<typeof action>();

  // Setup
  const repositoryNames = new Map(
    repositories.map((repository) => [repository.id, repository.name]),
  );
  const fetcherData = fetcher.data;
  const hasRuleError = fetcherData != null && 'ruleError' in fetcherData;
  const ruleError = hasRuleError ? fetcherData.ruleError : null;

  // Handlers
  const handleToggleEnabled = (value: TagActionRuleRowFragment): void => {
    fetcher.submit(
      { intent: 'toggleEnabled', rule: JSON.stringify(value) },
      { method: 'post' },
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (rule == null) {
    return (
      <GlobalScreen>
        <p className="font-medium">{RULE_DETAIL_COPY.notFoundTitle}</p>
        <p className="text-muted-foreground text-sm">
          {RULES_NOT_FOUND_COPY.description}
        </p>
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen>
      <RuleDetailHeader
        onToggleEnabled={handleToggleEnabled}
        pending={fetcher.state !== 'idle'}
        repositoryNames={repositoryNames}
        rule={rule}
      />
      {ruleError != null && (
        <p className="text-destructive text-sm" role="alert">
          {ruleError}
        </p>
      )}
      {preview != null && (
        <RulePreviewSection repositoryNames={repositoryNames} state={preview} />
      )}
      <RuleApplicationsSection applications={applications} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const parsed = parseFormData(formData, RulesActionFormSchema, {
    allow: [],
  });
  if (!parsed.success) {
    return { ruleError: parsed.error };
  }

  const result = await runRulesAction(args.request, parsed.data);
  const isDeleted =
    'ruleSaved' in result && parsed.data.intent === 'deleteRule';
  if (isDeleted) {
    return redirect('/rules');
  }
  return result;
};

export const ErrorBoundary = GlobalErrorBoundary;
