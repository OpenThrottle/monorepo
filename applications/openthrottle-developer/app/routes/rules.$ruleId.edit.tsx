import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import {
  RuleEditLoaderDocument,
  RulesUpsertTagActionRuleDocument,
} from '~/__generated__/graphql';
import {
  RULES_COPY,
  RULES_NOT_FOUND_COPY,
} from '~/routing/rules/data/data.copy';
import { RuleForm } from '~/routing/rules/components/RuleForm';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/rules.$ruleId.edit';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.rule?.title ?? 'Edit',
  links: (_match) => [{ children: 'Rules', to: '/rules' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { ruleId } = args.params;
  if (ruleId == null || ruleId === '') {
    return { rule: null, skillSlugs: [], vocabulary: [] };
  }

  const page = await executeGraphqlWithAuth(
    args.request,
    RuleEditLoaderDocument,
    {
      id: ruleId,
    },
  );

  return {
    rule: page.tagActionRule ?? null,
    skillSlugs: (page.skillAvailability.skills ?? [])
      .filter((skill) => !skill.effectiveDisableModelInvocation)
      .map((skill) => skill.slug),
    vocabulary: page.skillTagVocabulary.tags ?? [],
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const title = args.loaderData?.rule?.title;
  return [
    {
      title: title
        ? `${RULES_COPY.editTitle}: ${title} | ${SITE_TITLE}`
        : `${RULES_COPY.editTitle} | ${SITE_TITLE}`,
    },
  ];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData } = props;
  const { rule, skillSlugs, vocabulary } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (rule == null) {
    return (
      <GlobalScreen>
        <p className="font-medium">{RULES_NOT_FOUND_COPY.title}</p>
        <p className="text-muted-foreground text-sm">
          {RULES_NOT_FOUND_COPY.description}
        </p>
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen>
      <RuleForm
        actionData={actionData}
        initialRule={rule}
        skillSlugs={skillSlugs}
        vocabulary={vocabulary}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { ruleId } = args.params;
  if (ruleId == null || ruleId === '') {
    return { error: 'Rule id is required.' };
  }

  const formData = await args.request.formData();

  const actionPayloadJson = formData.get('actionPayloadJson');
  const actionType = formData.get('actionType');
  const environment = formData.get('environment');
  const id = formData.get('id');
  const status = formData.get('status');
  const title = formData.get('title');

  if (typeof id !== 'string' || id !== ruleId) {
    return { error: 'Rule id does not match.' };
  }
  if (typeof title !== 'string' || title.trim() === '') {
    return { error: 'Title is required.' };
  }
  if (typeof actionType !== 'string' || actionType === '') {
    return { error: 'Action type is required.' };
  }
  if (typeof actionPayloadJson !== 'string' || actionPayloadJson === '') {
    return { error: 'Action payload is required.' };
  }

  const enabled = formData.get('enabled') !== 'false';
  const tagAll = formData
    .getAll('tagAll')
    .filter((value): value is string => typeof value === 'string');

  const input = {
    actionPayloadJson,
    actionType,
    enabled,
    environment:
      typeof environment === 'string' && environment.trim() !== ''
        ? environment.trim()
        : null,
    id: ruleId,
    status:
      typeof status === 'string' && status.trim() !== '' ? status.trim() : null,
    tagAll,
    title: title.trim(),
  };

  try {
    await executeGraphqlWithAuth(
      args.request,
      RulesUpsertTagActionRuleDocument,
      {
        input,
      },
    );

    return redirect('/rules');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: message };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
