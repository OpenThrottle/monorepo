import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { Button } from '@openthrottle/react-router-shadcn';
import { Link, useFetcher, useNavigate } from 'react-router';
import { WandSparklesIcon } from 'lucide-react';
import {
  RulesDeleteTagActionRuleDocument,
  RulesIndexLoaderDocument,
  RulesUpsertTagActionRuleDocument,
} from '~/__generated__/graphql';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { RulesTable } from '~/routing/rules/components/RulesTable';
import type { TagActionRuleRowData } from '~/routing/rules/components/RulesTable';
import { SITE_TITLE } from '~/global/config/settings';
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
  const navigate = useNavigate();

  // Setup
  const pending = fetcher.state !== 'idle';
  const ruleError =
    fetcher.data != null && 'ruleError' in fetcher.data
      ? fetcher.data.ruleError
      : null;

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

  const handleEdit = (rule: TagActionRuleRowData): void => {
    void navigate(`/rules/${rule.id}/edit`);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="flex h-full w-full flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <GlobalHeading icon={WandSparklesIcon} title={RULES_COPY.pageTitle} />
        <Button asChild={true} size="sm">
          <Link to="/rules/new">{RULES_COPY.newRuleAction}</Link>
        </Button>
      </div>

      {ruleError != null ? (
        <p className="text-destructive text-sm" role="alert">
          {ruleError}
        </p>
      ) : null}

      <RulesTable
        onDelete={handleDelete}
        onEdit={handleEdit}
        onToggleEnabled={handleToggleEnabled}
        pending={pending}
        rules={rules}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
