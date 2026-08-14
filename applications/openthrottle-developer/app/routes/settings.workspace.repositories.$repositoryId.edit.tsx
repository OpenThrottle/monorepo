import * as React from 'react';
import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import {
  GetWorkspaceRepositoryForEditDocument,
  UpdateRepositoryDocument,
} from '~/__generated__/graphql';
import { WorkspaceRepositoryEditForm } from '~/routing/settings/components/WorkspaceRepositoryEditForm';
import {
  optionalTrimmedString,
  parseProjectIdFromFormData,
  workspaceRepositoryDetailPath,
} from '~/routing/settings/utils/workspace-settings-action';
import type { Route } from '@/app/routes/+types/settings.workspace.repositories.$repositoryId.edit';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Edit',
  links: (match) => [
    { children: 'Settings', to: '/settings' },
    { children: 'Workspace', to: '/settings/workspace' },
    {
      children: match.loaderData?.repository.name ?? 'Repository',
      to: workspaceRepositoryDetailPath(match.loaderData?.repository.id ?? ''),
    },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const data = await executeGraphqlWithAuth(
    args.request,
    GetWorkspaceRepositoryForEditDocument,
    { repositoryId: args.params.repositoryId },
  );

  if (!data.workspaceRepository) {
    throw new Response('Repository not found', { status: 404 });
  }

  return { projects: data.projects, repository: data.workspaceRepository };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const name = args.loaderData?.repository.name ?? 'Repository';
  return [{ title: `Edit ${name} | Workspace settings | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  const { actionData, loaderData, params } = props;
  const { projects, repository } = loaderData;
  const actionError =
    actionData && 'error' in actionData ? actionData.error : null;

  return (
    <GlobalScreen>
      <WorkspaceRepositoryEditForm
        actionError={actionError}
        cancelTo={workspaceRepositoryDetailPath(params.repositoryId)}
        projects={projects}
        repository={repository}
      />
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'updateRepository') {
    try {
      await executeGraphqlWithAuth(args.request, UpdateRepositoryDocument, {
        input: {
          defaultBranch: optionalTrimmedString(formData.get('defaultBranch')),
          foreignSkillInjectionEnabled:
            formData.get('foreignSkillInjectionEnabled') === 'true',
          id: args.params.repositoryId,
          name: optionalTrimmedString(formData.get('name')),
          projectId: parseProjectIdFromFormData(formData.get('projectId')),
        },
      });
      return redirect(workspaceRepositoryDetailPath(args.params.repositoryId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update repository.';
      return { error: message };
    }
  }

  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
