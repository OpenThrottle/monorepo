import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { Link, redirect } from 'react-router';
import { CreatePlanDocument } from '~/__generated__/graphql';
import { PlanCreateMcpParityShell } from '~/routing/plans/components/PlanCreateMcpParityShell';
import { PlanForm } from '~/routing/plans/components/PlanForm';
import type { PlanFormActionData } from '~/routing/plans/data/plan-form-action-data';
import {
  readPlanFormValues,
  resolvePlanFormErrorField,
} from '~/routing/plans/utils/plan-form-values';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/plans.create';
import { Button } from '@openthrottle/react-router-shadcn';

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
  const directory = `/Users/matt/Development/openthrottle`;

  const linkCursor = `cursor://file${directory}`;
  const linkClaude = `claude://file${directory}`;
  const linkVSCode = `vscode://file${directory}`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div className="flex gap-4">
        <Link to={linkCursor}>
          <Button>Cursor</Button>
        </Link>
        <Link to={linkClaude}>
          <Button>Claude</Button>
        </Link>
        <Link to={linkVSCode}>
          <Button>VSCode</Button>
        </Link>
      </div>

      <PlanCreateMcpParityShell>
        <PlanForm actionData={actionData} />
      </PlanCreateMcpParityShell>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  // 🚨 Every failed return below echoes `values` back so the form re-renders
  // with what the user typed instead of clearing itself.
  const values = readPlanFormValues(formData);

  if (!values.category?.trim()) {
    return {
      error: 'Category is required.',
      field: 'category',
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
    author: values.author?.trim() ?? '',
    category: values.category.trim(),
    title: values.title.trim(),
    ...(values.assignee?.trim() && { assignee: values.assignee.trim() }),
    ...(values.description?.trim() && {
      description: values.description.trim(),
    }),
    ...(values.project?.trim() && { project: values.project.trim() }),
    ...(values.projectId?.trim() && { projectId: values.projectId.trim() }),
    ...(values.status?.trim() && { status: values.status.trim() }),
    ...(values.summary?.trim() && { summary: values.summary.trim() }),
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreatePlanDocument,
      { input },
    );

    if (!result.createPlan?.id) {
      return {
        error: 'Failed to create plan.',
        values,
      } satisfies PlanFormActionData;
    }

    return redirect(`/plans/${result.createPlan.id}`);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Failed to create plan.';

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
