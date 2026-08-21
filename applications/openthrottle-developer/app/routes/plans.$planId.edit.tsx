import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import {
  GetPlanByIdDocument,
  UpdatePlanDocument,
} from '~/__generated__/graphql';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { PlanForm } from '~/routing/plans/components/PlanForm';
import type { PlanFormActionData } from '~/routing/plans/data/plan-form-action-data';
import {
  readPlanFormValues,
  resolvePlanFormErrorField,
} from '~/routing/plans/utils/plan-form-values';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/plans.$planId.edit';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Edit',
  links: (match) => [
    { children: 'Plans', to: '/plans' },
    {
      children: match.loaderData?.plan?.title,
      to: `/plans/${match.loaderData?.plan?.id}`,
    },
  ],
};

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

export const links: Route.LinksFunction = () => {
  return [];
};

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
      <GlobalScreen>
        <p className="text-destructive">Plan not found.</p>
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen>
      <PlanForm actionData={actionData} plan={plan} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const { planId } = args.params;
  const formData = await args.request.formData();

  // 🚨 Every failed return below echoes `values` back so the form re-renders
  // with what the user typed instead of clearing itself.
  const values = readPlanFormValues(formData);
  const id = formData.get('id');

  if (planId == null || planId === '') {
    return {
      error: 'Plan id is required.',
      values,
    } satisfies PlanFormActionData;
  }

  if (!values.author?.trim()) {
    return {
      error: 'Author is required.',
      field: 'author',
      values,
    } satisfies PlanFormActionData;
  }

  if (!values.category?.trim()) {
    return {
      error: 'Category is required.',
      field: 'category',
      values,
    } satisfies PlanFormActionData;
  }

  if (typeof id !== 'string' || id.trim() === '') {
    return {
      error: 'Plan id is required.',
      values,
    } satisfies PlanFormActionData;
  }

  if (id !== planId) {
    return {
      error: 'Plan id does not match.',
      values,
    } satisfies PlanFormActionData;
  }

  if (!values.title?.trim()) {
    return {
      error: 'Title is required.',
      field: 'title',
      values,
    } satisfies PlanFormActionData;
  }

  const input = {
    assignee: values.assignee?.trim() ?? '',
    author: values.author.trim(),
    category: values.category.trim(),
    description: values.description?.trim() ?? '',
    id: planId,
    projectId: values.projectId?.trim() || null,
    summary: values.summary?.trim() ?? '',
    title: values.title.trim(),
    ...(values.status?.trim() && { status: values.status.trim() }),
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      UpdatePlanDocument,
      { input },
    );

    if (!result.updatePlan?.id) {
      return {
        error: 'Failed to update plan.',
        values,
      } satisfies PlanFormActionData;
    }

    return redirect(`/plans/${result.updatePlan.id}`);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Failed to update plan.';

    return {
      error: message,
      field: resolvePlanFormErrorField(message),
      values,
    } satisfies PlanFormActionData;
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
