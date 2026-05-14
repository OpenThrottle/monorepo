import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { ProjectForm } from '~/routing/projects/components/ProjectForm';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { CreateProjectDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/projects.create';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Create',
  links: (_match) => [{ children: 'Projects', to: '/projects' }],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Create project | ${SITE_TITLE}` }];
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
      <ProjectForm actionData={actionData} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const name = formData.get('name');

  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Project name is required.' };
  }

  const description = formData.get('description');
  const nxProjectName = formData.get('nxProjectName');

  const input = {
    name: name.trim(),
    ...(typeof description === 'string' &&
      description.trim() && { description: description.trim() }),
    ...(typeof nxProjectName === 'string' &&
      nxProjectName.trim() && { nxProjectName: nxProjectName.trim() }),
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreateProjectDocument,
      { input },
    );

    if (!result.createProject?.id) {
      return { error: 'Failed to create project.' };
    }

    return redirect(`/projects/${result.createProject.id}`);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Failed to create project.';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
