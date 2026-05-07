import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { CreatePlanDocument } from '~/__generated__/graphql';
import { PlanForm } from '~/routing/plans/components/PlanForm';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/plans.create';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create',
  links: (_match) => [{ children: 'Plans', to: '/plans' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create plan | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <PlanForm actionData={actionData} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  const author = formData.get('author');
  const category = formData.get('category');
  const title = formData.get('title');

  if (typeof author !== 'string' || !author.trim()) {
    return { error: 'Author is required.' };
  }

  if (typeof category !== 'string' || !category.trim()) {
    return { error: 'Category is required.' };
  }

  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'Title is required.' };
  }

  const assignee = formData.get('assignee');
  const description = formData.get('description');
  const project = formData.get('project');
  const projectId = formData.get('projectId');
  const status = formData.get('status');
  const summary = formData.get('summary');

  const input = {
    author: author.trim(),
    category: category.trim(),
    title: title.trim(),
    ...(typeof assignee === 'string' &&
      assignee.trim() && { assignee: assignee.trim() }),
    ...(typeof description === 'string' &&
      description.trim() && { description: description.trim() }),
    ...(typeof project === 'string' &&
      project.trim() && { project: project.trim() }),
    ...(typeof projectId === 'string' &&
      projectId.trim() && { projectId: projectId.trim() }),
    ...(typeof status === 'string' &&
      status.trim() && { status: status.trim() }),
    ...(typeof summary === 'string' &&
      summary.trim() && { summary: summary.trim() }),
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreatePlanDocument,
      { input },
    );

    if (!result.createPlan?.id) {
      return { error: 'Failed to create plan.' };
    }

    return redirect(`/plans/${result.createPlan.id}`);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Failed to create plan.';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
