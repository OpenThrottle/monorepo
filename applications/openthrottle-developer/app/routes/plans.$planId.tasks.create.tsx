import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/plans.$planId.tasks.create';
import {
  CreateTaskDocument,
  GetPlanByIdDocument,
} from '~/__generated__/graphql';
import { TaskForm } from '~/routing/plans/components/TaskForm';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create',
  links: (_match) => [
    { children: 'Plans', to: '/plans' },
    { children: 'Tasks', to: '/plans/tasks' },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { planId } = args.params;

  if (planId == null || planId === '') {
    return redirect('/plans');
  }

  const result = await executeGraphqlWithAuth(
    args.request,
    GetPlanByIdDocument,
    { id: planId },
  );
  const plan = result.plan ?? null;

  return { plan, planId };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const plan = args.loaderData?.plan;
  const title = plan?.title
    ? `New task · ${plan.title} | ${SITE_TITLE}`
    : `New task | ${SITE_TITLE}`;
  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement | null {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { planId } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!planId) {
    return null;
  }

  return (
    <GlobalScreen>
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl my-4 text-accent">New task</h1>
        <TaskForm actionData={actionData} planId={planId} />
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { planId } = args.params;
  const formData = await args.request.formData();
  const formPlanId = formData.get('planId');
  const title = formData.get('title');

  if (typeof formPlanId !== 'string' || formPlanId.trim() === '') {
    return { error: 'Plan id is required.' };
  }
  if (planId != null && formPlanId.trim() !== planId) {
    return { error: 'Plan id does not match route.' };
  }
  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'Title is required.' };
  }

  const assignee = formData.get('assignee');
  const category = formData.get('category');
  const description = formData.get('description');
  const requirements = formData.get('requirements');
  const status = formData.get('status');
  const summary = formData.get('summary');

  const input = {
    planId: formPlanId.trim(),
    title: title.trim(),
    ...(typeof assignee === 'string' &&
      assignee.trim() && { assignee: assignee.trim() }),
    ...(typeof category === 'string' &&
      category.trim() && { category: category.trim() }),
    ...(typeof description === 'string' &&
      description.trim() && { description: description.trim() }),
    ...(typeof requirements === 'string' &&
      requirements.trim() && { requirements: requirements.trim() }),
    ...(typeof status === 'string' &&
      status.trim() && { status: status.trim() }),
    ...(typeof summary === 'string' &&
      summary.trim() && { summary: summary.trim() }),
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreateTaskDocument,
      { input },
    );

    if (!result.createTask?.id) {
      return { error: 'Failed to create task.' };
    }

    const effectivePlanId = planId ?? formPlanId.trim();

    return redirect(`/plans/${effectivePlanId}/tasks/${result.createTask.id}`);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Failed to create task.';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
