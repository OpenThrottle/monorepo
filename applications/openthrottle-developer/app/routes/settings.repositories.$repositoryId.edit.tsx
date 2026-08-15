import * as React from 'react';
import { redirect } from 'react-router';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
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
import { RepositoryEditForm } from '~/routing/settings/repositories/components/RepositoryEditForm';
import { repositoryDetailPath } from '~/routing/settings/repositories/utils/paths';
import {
  optionalTrimmedString,
  parseProjectIdFromFormData,
} from '~/routing/settings/utils/workspace-settings-action';
import type { Route } from '@/app/routes/+types/settings.repositories.$repositoryId.edit';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Edit',
  links: (match) => [
    { children: 'Settings', to: '/settings' },
    { children: 'Repositories', to: '/settings/repositories' },
    {
      children: match.loaderData?.repository.name ?? 'Repository',
      to: repositoryDetailPath(match.loaderData?.repository.id ?? ''),
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
  return [{ title: `Edit ${name} | Repository settings | ${SITE_TITLE}` }];
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
  const actionError = getActionError(actionData) ?? null;

  return (
    <GlobalScreen>
      <RepositoryEditForm
        actionError={actionError}
        cancelTo={repositoryDetailPath(params.repositoryId)}
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
      return redirect(repositoryDetailPath(args.params.repositoryId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update repository.';
      return { error: message };
    }
  }

  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
