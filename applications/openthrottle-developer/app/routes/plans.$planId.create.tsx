import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { OpenThrottleBreadcrumbs } from '@openthrottle/react-router-ui';
import { redirect } from 'react-router';
import { PlanForm } from '~/routing/plans/components/PlanForm';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { CreatePlanDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/plans.$planId.create';

// export const loader = async (_args: Route.LoaderArgs) => {
//   return {};
// };

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

// export const meta = (_args: Route.MetaArgs) => {
//   return [{ title: `PlansCreate | ${SITE_TITLE}` }];
// };

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
    <main className="p-4 md:p-8 relative h-full max-w-7xl mx-auto w-full">
      <OpenThrottleBreadcrumbs
        children="Create Plan"
        className="mb-4"
        links={[{ children: 'Plans', to: '/plans' }]}
      />
      <PlanForm actionData={actionData} />
    </main>
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
