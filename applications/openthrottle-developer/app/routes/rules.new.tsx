import {
  coerceBoolean,
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
import { redirect } from 'react-router';
import { z } from 'zod/v3';

import type { Route } from '@/app/routes/+types/rules.new';
import {
  RuleNewProjectsDocument,
  RuleNewPromptsDocument,
  RuleNewRepositoriesDocument,
  RulesIndexLoaderDocument,
  RulesUpsertTagActionRuleDocument,
} from '~/__generated__/graphql';
import { UpsertTagActionRuleInputSchema } from '~/__generated__/schemas';
import { SITE_TITLE } from '~/global/config/settings';
import { RuleForm } from '~/routing/rules/components/RuleForm';
import { RULES_COPY } from '~/routing/rules/data/data.copy';
import { buildRulePromptOptions } from '~/routing/rules/utils/rule-prompt-options';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create',
  links: (_match) => [{ children: 'Rules', to: '/rules' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const [page, workspace, projects, prompts] = await Promise.all([
    executeGraphqlWithAuth(args.request, RulesIndexLoaderDocument, {}),
    executeGraphqlWithAuth(args.request, RuleNewRepositoriesDocument, {}),
    executeGraphqlWithAuth(args.request, RuleNewProjectsDocument, {}),
    executeGraphqlWithAuth(args.request, RuleNewPromptsDocument, {}),
  ]);

  return {
    projects: projects.projects,
    promptOptions: buildRulePromptOptions(prompts.personas, prompts.prompts),
    repositories: workspace.workspaceRepositories,
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
  const { projects, promptOptions, repositories, skillSlugs, vocabulary } =
    loaderData;

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
        projects={projects}
        promptOptions={promptOptions}
        repositories={repositories}
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
      .omit({ id: true })
      .extend({
        enabled: coerceBoolean(z.boolean().default(true)),
        // Absent `tagAll` (a rule with no tags) is valid — default to `[]` so it
        // does not fail the generated required-array field.
        // Blank (all projects / repositories) is dropped by parseFormData; a value must be a UUID.
        projectId: z.string().uuid().nullish(),
        repositoryId: z.string().uuid().nullish(),
        tagAll: z.array(z.string().min(1)).default([]),
      }),
    { lists: ['tagAll'], strict: false },
  );
  if (!parsed.success) {
    if (parsed.fieldErrors.title) return { error: 'Title is required.' };
    if (parsed.fieldErrors.actionType) {
      return { error: 'Action type is required.' };
    }
    if (parsed.fieldErrors.projectId) {
      return { error: 'Project must be a valid id.' };
    }
    if (parsed.fieldErrors.repositoryId) {
      return { error: 'Repository must be a valid id.' };
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
    projectId: parsed.data.projectId ?? null,
    repositoryId: parsed.data.repositoryId ?? null,
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
