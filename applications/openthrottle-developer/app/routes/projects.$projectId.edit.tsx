import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  GetProjectForEditDocument,
  UpdateProjectDocument,
} from '~/__generated__/graphql';
import { ProjectForm } from '~/routing/projects/components/ProjectForm';
import { ProjectNotFound } from '~/routing/projects/components/ProjectNotFound';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/projects.$projectId.edit';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Edit',
  links: (match) => {
    const project = match.loaderData?.project;
    const links = [{ children: 'Projects', to: '/projects' }];

    if (project) {
      links.push({ children: project.name, to: `/projects/${project.id}` });
    }

    return links;
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const projectId = args.params.projectId;

  const { project } = await executeGraphqlWithAuth(
    args.request,
    GetProjectForEditDocument,
    { id: projectId },
  );

  return { project };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const project = args.loaderData?.project;
  const title = project?.name
    ? `Edit ${project.name} | Projects | ${SITE_TITLE}`
    : `Edit project | ${SITE_TITLE}`;

  return [{ title }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { project } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!project) {
    return <ProjectNotFound />;
  }

  return (
    <GlobalScreen>
      <ProjectForm
        actionData={actionData}
        cancelTo={`/projects/${project.id}`}
        defaultValues={{
          description: project.description,
          name: project.name,
          nxProjectName: project.nxProjectName,
        }}
        submitLabel="Save changes"
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const projectId = args.params.projectId;
  const formData = await args.request.formData();
  const name = formData.get('name');

  if (typeof name !== 'string' || !name.trim()) {
    return { error: 'Project name is required.' };
  }

  const description = formData.get('description');
  const nxProjectName = formData.get('nxProjectName');

  const input = {
    description:
      typeof description === 'string' && description.trim()
        ? description.trim()
        : null,
    id: projectId,
    name: name.trim(),
    nxProjectName:
      typeof nxProjectName === 'string' && nxProjectName.trim()
        ? nxProjectName.trim()
        : null,
  };

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      UpdateProjectDocument,
      { input },
    );

    if (!result.updateProject?.id) {
      return { error: 'Failed to update project.' };
    }

    return redirect(`/projects/${result.updateProject.id}`);
  } catch (error) {
    const isError = error instanceof Error;
    const message = isError ? error.message : 'Failed to update project.';

    return { error: message };
  }

  // 🚨 Default to invalid action error when no intent is provided.
  // throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
