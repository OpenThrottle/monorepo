import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import { GetWorkspaceSettingsDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { IdeWorkspaceBody } from '~/routing/ide/components/IdeWorkspaceBody';
import { useIdeWorkspace } from '~/routing/ide/hooks/useIdeWorkspace';
import {
  resolveSelectedRepository,
  toRepositoryOptions,
} from '~/routing/ide/utils/repositories';
import type { Route } from '@/app/routes/+types/ide._index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'IDE',
  links: (_match) => [],
};

export const loader = async (args: Route.LoaderArgs) => {
  const url = args.url;
  const repositoryId = url.searchParams.get('repositoryId');
  const query = url.searchParams.get('q') ?? '';

  const data = await executeGraphqlWithAuth(
    args.request,
    GetWorkspaceSettingsDocument,
  );
  const localRepositories = data.workspaceSettings.localRepositories;
  const repositories = toRepositoryOptions(localRepositories);
  const resolved = resolveSelectedRepository(localRepositories, repositoryId);

  if (resolved === null) {
    return {
      listing: null,
      query,
      repositories,
      search: null,
      selectedId: null,
    };
  }

  const { listFilesVM, searchVM } =
    await import('~/routing/ide/data/ide-engine.server');
  const listing = await listFilesVM(resolved.config, resolved.repository);
  const search =
    query.trim() === ''
      ? null
      : await searchVM(resolved.config, resolved.repository, query);

  return {
    listing,
    query,
    repositories,
    search,
    selectedId: resolved.repository.repositoryId,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `IDE | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { listing, query, repositories, search, selectedId } = props.loaderData;

  // Hooks
  const workspace = useIdeWorkspace(selectedId);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <IdeWorkspaceBody
        listing={listing}
        query={query}
        repositories={repositories}
        search={search}
        selectedId={selectedId}
        workspace={workspace}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
