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
  RulesIndexLoaderDocument,
  RulesUpsertTagActionRuleDocument,
} from '~/__generated__/graphql';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { RuleForm } from '~/routing/rules/components/RuleForm';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/rules.new';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create',
  links: (_match) => [{ children: 'Rules', to: '/rules' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const page = await executeGraphqlWithAuth(
    args.request,
    RulesIndexLoaderDocument,
    {},
  );

  return {
    skillSlugs: (page.skillAvailability.skills ?? [])
      .filter((skill) => !skill.effectiveDisableModelInvocation)
      .map((skill) => skill.slug),
    vocabulary: page.skillTagVocabulary.tags ?? [],
  };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta(() => [
  { title: `${RULES_COPY.createTitle} | ${SITE_TITLE}` },
]);

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData } = props;
  const { skillSlugs, vocabulary } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <RuleForm
        actionData={actionData}
        skillSlugs={skillSlugs}
        vocabulary={vocabulary}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  const actionPayloadJson = formData.get('actionPayloadJson');
  const actionType = formData.get('actionType');
  const environment = formData.get('environment');
  const status = formData.get('status');
  const title = formData.get('title');

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
