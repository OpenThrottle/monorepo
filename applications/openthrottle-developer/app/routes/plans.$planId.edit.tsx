import * as React from 'react';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/plans.$planId.edit';
import {
  GetPlanByIdDocument,
  UpdatePlanDocument,
} from '~/__generated__/graphql';
import { PlanForm } from '~/routing/plans/components/PlanForm';

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

export default function Index(props: Route.ComponentProps) {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { plan } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (plan == null) {
    return (
      <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
        <p className="text-destructive">Plan not found.</p>
      </main>
    );
  }

  return (
    <main className="p-4 md:p-8 lg:p-12 relative h-full max-w-7xl mx-auto w-full">
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl my-4 text-highlight">Edit plan</h1>
        <PlanForm actionData={actionData} plan={plan} />
      </div>
    </main>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { planId } = args.params;
  if (planId == null || planId === '') {
    return { error: 'Plan id is required.' };
  }
  const formData = await args.request.formData();
  const id = formData.get('id');
  const title = formData.get('title');
  const category = formData.get('category');
  const author = formData.get('author');

  if (typeof id !== 'string' || id.trim() === '') {
    return { error: 'Plan id is required.' };
  }
  if (id !== planId) {
    return { error: 'Plan id does not match.' };
  }
  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'Title is required.' };
  }
  if (typeof category !== 'string' || !category.trim()) {
    return { error: 'Category is required.' };
  }
  if (typeof author !== 'string' || !author.trim()) {
    return { error: 'Author is required.' };
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
    const message =
      error instanceof Error ? error.message : 'Failed to update plan.';
    return { error: message };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
