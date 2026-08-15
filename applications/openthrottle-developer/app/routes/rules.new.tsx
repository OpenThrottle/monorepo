import * as React from 'react';
import {
  coerceBoolean,
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { z } from 'zod/v3';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import { UpsertTagActionRuleInputSchema } from '~/__generated__/schemas';
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

  const parsed = parseFormData(
    formData,
    UpsertTagActionRuleInputSchema()
      .omit({ id: true, projectId: true })
      .extend({
        enabled: coerceBoolean(z.boolean().default(true)),
        // Absent `tagAll` (a rule with no tags) is valid — default to `[]` so it
        // does not fail the generated required-array field.
        tagAll: z.array(z.string().min(1)).default([]),
      }),
    { lists: ['tagAll'], strict: false },
  );
  if (!parsed.success) {
    if (parsed.fieldErrors.title) return { error: 'Title is required.' };
    if (parsed.fieldErrors.actionType) {
      return { error: 'Action type is required.' };
    }
    if (parsed.fieldErrors.actionPayloadJson) {
      return { error: 'Action payload is required.' };
    }
    return { error: parsed.error };
  }

  const input = {
    actionPayloadJson: parsed.data.actionPayloadJson,
    actionType: parsed.data.actionType,
    enabled: parsed.data.enabled,
    environment: parsed.data.environment ?? null,
    status: parsed.data.status ?? null,
    tagAll: parsed.data.tagAll,
    title: parsed.data.title,
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
