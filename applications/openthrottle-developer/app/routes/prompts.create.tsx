import * as React from 'react';
import { redirect } from 'react-router';
import { z } from 'zod/v3';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  CreatePromptDocument,
  CustomPromptType,
} from '~/__generated__/graphql';
import { CreateCustomPromptInputSchema } from '~/__generated__/schemas';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { PROMPTS_BASE_PATH } from '~/routing/prompts/config';
import { PromptCreateForm } from '~/routing/prompts/components/PromptCreateForm';
import { usePromptCreateForm } from '~/routing/prompts/hooks/usePromptCreateForm';
import type { Route } from '@/app/routes/+types/prompts.create';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create Prompt',
  links: (_match) => [{ children: 'Prompts', to: '/prompts' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create Prompt | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks
  const form = usePromptCreateForm();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="max-w-5xl-- flex h-full w-full flex-col gap-4 md:gap-8 lg:gap-12">
      <PromptCreateForm error={actionData?.error} form={form} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  // `promptType` is dropped (the form posts the editor's local type; this route
  // always creates a `Prompts` prompt) and re-injected below. `labels` arrives
  // as a comma-separated string, so preprocess it into the schema's array.
  // `writeToFileSystem` is omitted so the server default stands, unchanged.
  const parsed = parseFormData(
    formData,
    CreateCustomPromptInputSchema()
      .omit({ promptType: true, writeToFileSystem: true })
      .extend({
        labels: z.preprocess(
          (value) =>
            typeof value === 'string'
              ? value
                  .split(',')
                  .map((label) => label.trim())
                  .filter((label) => label.length > 0)
              : [],
          z.array(z.string().min(1)),
        ),
      }),
    { allow: ['intent', 'promptType'] },
  );

  if (!parsed.success) {
    if (parsed.fieldErrors.title) {
      return { error: 'Title is required.' };
    }
    if (parsed.fieldErrors.content) {
      return { error: 'Content is required.' };
    }
    return { error: parsed.error };
  }

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreatePromptDocument,
      { input: { ...parsed.data, promptType: CustomPromptType.Prompts } },
    );

    if (!result.createCustomPrompt) {
      return { error: 'Failed to create prompt.' };
    }

    const newPromptId = result.createCustomPrompt.id;
    return redirect(`${PROMPTS_BASE_PATH}/${encodeURIComponent(newPromptId)}`);
  } catch {
    return { error: 'Failed to create prompt.' };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
