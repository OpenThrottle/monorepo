import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { FolderPenIcon } from 'lucide-react';
import * as React from 'react';

import type { Route } from '@/app/routes/+types/projects.$projectId.edit';
import { GetProjectForEditDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import {
  deleteProject,
  updateProject,
} from '~/routing/projects/actions/project-edit';
import { ProjectDeleteZone } from '~/routing/projects/components/ProjectDeleteZone';
import { ProjectForm } from '~/routing/projects/components/ProjectForm';
import { ProjectNotFound } from '~/routing/projects/components/ProjectNotFound';
import {
  PROJECT_EDIT_COPY,
  PROJECT_FORM_COPY,
} from '~/routing/projects/data/copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => PROJECT_EDIT_COPY.breadcrumb,
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
      <GlobalHeading
        heading="h1"
        icon={FolderPenIcon}
        title={`${PROJECT_EDIT_COPY.headingPrefix} ${project.name}`}
      />
      <ProjectForm
        actionData={actionData}
        cancelTo={`/projects/${project.id}`}
        defaultValues={{
          description: project.description,
          name: project.name,
        }}
        repositories={undefined}
        submitLabel={PROJECT_FORM_COPY.saveSubmit}
      />
      <ProjectDeleteZone projectName={project.name} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const projectId = args.params.projectId;
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  // The edit form posts no intent; the delete zone posts `deleteProject`.
  if (intent === 'deleteProject') {
    return deleteProject(args, projectId);
  }

  return updateProject(args, projectId, formData);
};

export const ErrorBoundary = GlobalErrorBoundary;
