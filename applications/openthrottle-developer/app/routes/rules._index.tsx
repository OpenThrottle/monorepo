import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { useFetcher, useSearchParams } from 'react-router';
import {
  RulesDeleteTagActionRuleDocument,
  RulesIndexLoaderDocument,
  RulesUpsertTagActionRuleDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { RulesIntroduction } from '~/routing/rules/components/RulesIntroduction';
import { RulesStats } from '~/routing/rules/components/RulesStats';
import {
  RulesTable,
  type TagActionRuleRowData,
} from '~/routing/rules/components/RulesTable';
import { RulesToolbar } from '~/routing/rules/components/RulesToolbar';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import {
  filterRulesList,
  parseRulesEnabledFilterFromSearchParams,
  parseRulesSearchFromSearchParams,
} from '~/routing/rules/utils/parsers';
import type { Route } from '@/app/routes/+types/rules._index';

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
    rules: page.tagActionRules ?? [],
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta(() => [
  { title: `${RULES_COPY.pageTitle} | ${SITE_TITLE}` },
]);

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  try {
    if (intent === 'deleteRule') {
      const id = formData.get('id');
      if (typeof id !== 'string' || id === '') {
        return { ruleError: 'Rule id is required.' };
      }
      await executeGraphqlWithAuth(
        args.request,
        RulesDeleteTagActionRuleDocument,
        { input: { id } },
      );
      return { ruleSaved: true };
    }

    if (intent === 'toggleEnabled') {
      const raw = formData.get('rule');
      if (typeof raw !== 'string' || raw === '') {
        return { ruleError: 'Rule payload is required.' };
      }
      const value: TagActionRuleRowData = JSON.parse(raw);
      await executeGraphqlWithAuth(
        args.request,
        RulesUpsertTagActionRuleDocument,
        {
          input: {
            actionPayloadJson: value.actionPayloadJson,
            actionType: value.actionType,
            enabled: !value.enabled,
            environment: value.environment,
            id: value.id,
            status: value.status,
            tagAll: value.tagAll,
            title: value.title,
          },
        },
      );
      return { ruleSaved: true };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ruleError: message };
  }

  return { ruleError: `Unknown intent "${String(intent)}".` };
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { rules } = loaderData;

  // Hooks
  const fetcher = useFetcher<typeof action>();
  const [searchParams] = useSearchParams();

  // Setup
  const enabledFilter = parseRulesEnabledFilterFromSearchParams(searchParams);
  const search = parseRulesSearchFromSearchParams(searchParams);
  const isFiltered = search.trim().length > 0 || enabledFilter !== 'all';
  const filteredRules = filterRulesList(rules, { enabledFilter, search });
  const pending = fetcher.state !== 'idle';
  const ruleError =
    fetcher.data != null && 'ruleError' in fetcher.data
      ? fetcher.data.ruleError
      : null;
  const totalCount = rules.length;
  const enabledCount = rules.filter((rule) => rule.enabled).length;
  const disabledCount = totalCount - enabledCount;

  // Handlers
  const handleToggleEnabled = (rule: TagActionRuleRowData): void => {
    fetcher.submit(
      { intent: 'toggleEnabled', rule: JSON.stringify(rule) },
      { method: 'post' },
    );
  };

  const handleDelete = (id: string): void => {
    fetcher.submit({ id, intent: 'deleteRule' }, { method: 'post' });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <RulesStats
        disabledCount={disabledCount}
        enabledCount={enabledCount}
        totalCount={totalCount}
      />
      <RulesIntroduction />

      {ruleError != null ? (
        <p className="text-destructive text-sm" role="alert">
          {ruleError}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <RulesToolbar />
        <RulesTable
          isFiltered={isFiltered}
          onDelete={handleDelete}
          onToggleEnabled={handleToggleEnabled}
          pending={pending}
          rules={filteredRules}
        />
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
