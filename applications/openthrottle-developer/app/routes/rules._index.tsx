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
import { useFetcher } from 'react-router';
import { WandSparklesIcon } from 'lucide-react';
import {
  RulesDeleteTagActionRuleDocument,
  RulesIndexLoaderDocument,
  RulesUpsertTagActionRuleDocument,
} from '~/__generated__/graphql';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { RuleForm } from '~/routing/rules/components/RuleForm';
import type { RuleFormValue } from '~/routing/rules/components/RuleForm';
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
    skillSlugs: (page.skillAvailability.skills ?? [])
      .filter((skill) => !skill.effectiveDisableModelInvocation)
      .map((skill) => skill.slug),
    vocabulary: page.skillTagVocabulary.tags ?? [],
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

    if (intent === 'upsertRule') {
      const raw = formData.get('rule');
      if (typeof raw !== 'string' || raw === '') {
        return { ruleError: 'Rule payload is required.' };
      }
      const value: RuleFormValue = JSON.parse(raw);
      await executeGraphqlWithAuth(
        args.request,
        RulesUpsertTagActionRuleDocument,
        {
          input: {
            actionPayloadJson: value.actionPayloadJson,
            actionType: value.actionType,
            enabled: value.enabled,
            environment: value.environment,
            id: value.id,
            status: value.status,
            tagAll: value.tagAll,
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
  const { rules, skillSlugs, vocabulary } = loaderData;

  // Hooks
  const fetcher = useFetcher<typeof action>();
  const [editing, setEditing] = React.useState<TagActionRuleRowData | null>(
    null,
  );
  const [showForm, setShowForm] = React.useState(false);

  // Setup
  const pending = fetcher.state !== 'idle';
  const ruleError =
    fetcher.data != null && 'ruleError' in fetcher.data
      ? fetcher.data.ruleError
      : null;

  // Handlers
  const handleSubmit = (value: RuleFormValue): void => {
    fetcher.submit(
      { intent: 'upsertRule', rule: JSON.stringify(value) },
      { method: 'post' },
    );
    setShowForm(false);
    setEditing(null);
  };

  const handleToggleEnabled = (rule: TagActionRuleRowData): void => {
    fetcher.submit(
      {
        intent: 'upsertRule',
        rule: JSON.stringify({
          actionPayloadJson: rule.actionPayloadJson,
          actionType: rule.actionType,
          enabled: !rule.enabled,
          environment: rule.environment,
          id: rule.id,
          status: rule.status,
          tagAll: rule.tagAll,
        }),
      },
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
    <GlobalScreen className="flex h-full w-full flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <GlobalHeading icon={WandSparklesIcon} title={RULES_COPY.pageTitle} />
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          size="sm"
          type="button"
        >
          {RULES_COPY.newRuleAction}
        </Button>
      </div>

      {ruleError != null ? (
        <p className="text-destructive text-sm" role="alert">
          {ruleError}
        </p>
      ) : null}

      {showForm || editing != null ? (
        <RuleForm
          initialRule={editing}
          key={editing?.id ?? 'create'}
          onCancel={() => {
            setEditing(null);
            setShowForm(false);
          }}
          onSubmit={handleSubmit}
          pending={pending}
          skillSlugs={skillSlugs}
          vocabulary={vocabulary}
        />
      ) : null}

      <RulesTable
        onDelete={handleDelete}
        onEdit={(rule) => {
          setEditing(rule);
          setShowForm(true);
        }}
        onToggleEnabled={handleToggleEnabled}
        pending={pending}
        rules={rules}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
