import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { OpenThrottleBreadcrumbs } from '@openthrottle/react-router-ui';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import {
  GetPlanByIdDocument,
  UpdatePlanDocument,
} from '~/__generated__/graphql';
import { PlanForm } from '~/routing/plans/components/PlanForm';
import type { Route } from '@/app/routes/+types/plans.$planId.edit';

export const loader = async (args: Route.LoaderArgs) => {
  const { planId } = args.params;
  if (planId == null || planId === '') {
    return { plan: null };
  }

  const result = await executeGraphqlWithAuth(
    args.request,
    GetPlanByIdDocument,
    { id: planId },
  );

  return { plan: result.plan ?? null };
};

// export const links: LinksFunction = () => {
//   return [{ href: stylesheet, rel: 'stylesheet' }];
// };

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const plan = args.loaderData?.plan;
  const title = plan?.title
    ? `Edit ${plan.title} | ${SITE_TITLE}`
    : `Edit plan | ${SITE_TITLE}`;

  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { plan } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!plan || plan === null) {
    return (
      <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
        <p className="text-destructive">Plan not found.</p>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 relative h-full max-w-7xl mx-auto w-full">
      <OpenThrottleBreadcrumbs
        children="Edit Plan"
        className="mb-4"
        links={[{ children: 'Plans', to: '/plans' }]}
      />

      <PlanForm actionData={actionData} plan={plan} />
    </main>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { planId } = args.params;
  if (planId == null || planId === '') {
    return { error: 'Plan id is required.' };
  }

  const formData = await args.request.formData();

  const author = formData.get('author');
  const category = formData.get('category');
  const id = formData.get('id');
  const title = formData.get('title');

  if (typeof author !== 'string' || !author.trim()) {
    return { error: 'Author is required.' };
  }

  if (typeof category !== 'string' || !category.trim()) {
    return { error: 'Category is required.' };
  }

  if (typeof id !== 'string' || id.trim() === '') {
    return { error: 'Plan id is required.' };
  }

  if (id !== planId) {
    return { error: 'Plan id does not match.' };
  }

  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'Title is required.' };
  }

  const assignee = formData.get('assignee');
  const description = formData.get('description');
  const projectId = formData.get('projectId');
  const status = formData.get('status');
  const summary = formData.get('summary');

  const input = {
    author: author.trim(),
    category: category.trim(),
    id: planId,
    title: title.trim(),
    ...(typeof assignee === 'string' && { assignee: assignee.trim() }),
    ...(typeof description === 'string' && { description: description.trim() }),
    ...(typeof projectId === 'string' && {
      projectId: projectId.trim() || null,
    }),
    ...(typeof status === 'string' &&
      status.trim() && { status: status.trim() }),
    ...(typeof summary === 'string' && { summary: summary.trim() }),
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      UpdatePlanDocument,
      { input },
    );

    if (!result.updatePlan?.id) {
      return { error: 'Failed to update plan.' };
    }

    return redirect(`/plans/${result.updatePlan.id}`);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Failed to update plan.';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
