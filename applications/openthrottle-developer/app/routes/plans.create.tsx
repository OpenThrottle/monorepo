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

  const author = formData.get('author');
  const category = formData.get('category');
  const title = formData.get('title');

  if (typeof category !== 'string' || !category.trim()) {
    return { error: 'Category is required.' };
  }

  if (typeof title !== 'string' || !title.trim()) {
    return { error: 'Title is required.' };
  }

  const authorStr = typeof author === 'string' ? author.trim() : '';

  const assignee = formData.get('assignee');
  const description = formData.get('description');
  const project = formData.get('project');
  const projectId = formData.get('projectId');
  const status = formData.get('status');
  const summary = formData.get('summary');

  const input = {
    author: authorStr,
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
