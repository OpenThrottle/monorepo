import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GetWorkspaceRepositoryDocument } from '~/__generated__/graphql';
import { RepositoryDetail } from '~/routing/settings/repositories/components/RepositoryDetail';
import type { Route } from '@/app/routes/+types/settings.repositories.$repositoryId._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (match) => match.loaderData?.repository.name ?? 'Repository',
  links: (_match) => [
    { children: 'Settings', to: '/settings' },
    { children: 'Repositories', to: '/settings/repositories' },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const data = await executeGraphqlWithAuth(
    args.request,
    GetWorkspaceRepositoryDocument,
    { repositoryId: args.params.repositoryId },
  );

  if (!data.workspaceRepository) {
    throw new Response('Repository not found', { status: 404 });
  }

  return { repository: data.workspaceRepository };
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const name = args.loaderData?.repository.name ?? 'Repository';
  return [{ title: `${name} | Repositories | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { repository } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <RepositoryDetail
        editTo={`/settings/repositories/${repository.id}/edit`}
        repository={repository}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
