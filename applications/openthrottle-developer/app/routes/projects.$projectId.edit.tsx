import * as React from 'react';
import { z } from 'zod/v3';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { redirect } from 'react-router';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  GetProjectForEditDocument,
  UpdateProjectDocument,
} from '~/__generated__/graphql';
import { UpdateProjectInputSchema } from '~/__generated__/schemas';
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

  // `id` is the route param. `name` is required at the UI layer (the generated
  // Update schema leaves it optional), so tighten it to `min(1)`. `description`
  // and `nxProjectName` clear to `null` when blank, matching the edit form.
  const parsed = parseFormData(
    formData,
    UpdateProjectInputSchema()
      .omit({ id: true })
      .extend({ name: z.string().min(1) }),
  );
  if (!parsed.success) {
    return { error: 'Project name is required.' };
  }

  const input = {
    description: parsed.data.description ?? null,
    id: projectId,
    name: parsed.data.name,
    nxProjectName: parsed.data.nxProjectName ?? null,
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
