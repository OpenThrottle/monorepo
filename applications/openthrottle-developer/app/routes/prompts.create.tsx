import * as React from 'react';
import { redirect } from 'react-router';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  CreatePromptDocument,
  CustomPromptType,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { PROMPTS_BASE_PATH } from '~/routing/prompts/config';
import { PromptCreateForm } from '~/routing/prompts/components/PromptCreateForm';
import { usePromptCreateForm } from '~/routing/prompts/hooks/usePromptCreateForm';
import type { CreateCustomPromptInput } from '~/__generated__/graphql';
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

  const content = formData.get('content');
  const description = formData.get('description');
  const filePath = formData.get('filePath');
  const labelsRaw = formData.get('labels');
  const promptType = formData.get('promptType');
  const title = formData.get('title');

  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'Title is required.' };
  }

  if (typeof content !== 'string' || !content.trim()) {
    return { error: 'Content is required.' };
  }

  if (typeof promptType !== 'string') {
    return { error: 'Prompt type is required.' };
  }

  const labels =
    typeof labelsRaw === 'string' && labelsRaw.trim()
      ? labelsRaw
          .split(',')
          .map((l) => l.trim())
          .filter((l) => l.length > 0)
      : [];

  try {
    const input: CreateCustomPromptInput = {
      content,
      description:
        typeof description === 'string' && description.trim()
          ? description.trim()
          : undefined,
      filePath:
        typeof filePath === 'string' && filePath.trim()
          ? filePath.trim()
          : undefined,
      labels,
      promptType: CustomPromptType.Prompts,
      title: title.trim(),
    };

    const result = await executeGraphqlWithAuth(
      args.request,
      CreatePromptDocument,
      { input },
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
