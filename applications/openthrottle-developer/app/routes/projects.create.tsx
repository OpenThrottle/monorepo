import { toErrorMessageOr } from '@openthrottle/nodejs-utils';
import {
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { FolderPlusIcon } from 'lucide-react';
import * as React from 'react';
import { redirect } from 'react-router';
import { z } from 'zod/v3';

import type { Route } from '@/app/routes/+types/projects.create';
import {
  CreateProjectDocument,
  GetProjectCreateOptionsDocument,
  ProjectCreateLinkRepositoryDocument,
} from '~/__generated__/graphql';
import { CreateProjectInputSchema } from '~/__generated__/schemas';
import { SITE_TITLE } from '~/global/config/settings';
import { ProjectForm } from '~/routing/projects/components/ProjectForm';
import {
  PROJECT_CREATE_COPY,
  PROJECT_FORM_COPY,
} from '~/routing/projects/data/copy';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => PROJECT_CREATE_COPY.breadcrumb,
  links: (_match) => [{ children: 'Projects', to: '/projects' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const { workspaceRepositories } = await executeGraphqlWithAuth(
    args.request,
    GetProjectCreateOptionsDocument,
  );

  return { repositories: workspaceRepositories };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `${PROJECT_CREATE_COPY.metaTitle} | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { repositories } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <GlobalHeading
        heading="h1"
        icon={FolderPlusIcon}
        title={PROJECT_CREATE_COPY.heading}
      />
      <ProjectForm actionData={actionData} repositories={repositories} />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();

  // `nxProjectName` is deprecated (projects are initiatives), so the form no
  // longer offers it and strict parsing rejects it.
  const parsed = parseFormData(
    formData,
    CreateProjectInputSchema()
      .omit({ nxProjectName: true })
      .extend({ repositoryIds: z.array(z.string()).default([]) }),
    { lists: ['repositoryIds'] },
  );
  if (!parsed.success) {
    return { error: PROJECT_FORM_COPY.nameMissing };
  }

  const { description, name, repositoryIds } = parsed.data;

  try {
    const result = await executeGraphqlWithAuth(
      args.request,
      CreateProjectDocument,
      { input: { description: description ?? null, name } },
    );
    const projectId = result.createProject?.id;

    if (!projectId) {
      return { error: PROJECT_CREATE_COPY.createFailed };
    }

    // The project exists now, so a failed link must not turn into an error
    // that invites a duplicate create: the project page shows which links
    // landed and can link the rest.
    await Promise.allSettled(
      repositoryIds.map((repositoryId) => {
        return executeGraphqlWithAuth(
          args.request,
          ProjectCreateLinkRepositoryDocument,
          { input: { projectId, repositoryId } },
        );
      }),
    );

    return redirect(`/projects/${projectId}`);
  } catch (error) {
    return { error: toErrorMessageOr(error, PROJECT_CREATE_COPY.createFailed) };
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
