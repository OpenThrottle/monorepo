import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import * as React from 'react';
import type { ShouldRevalidateFunction } from 'react-router';
import { useSearchParams } from 'react-router';

import type { Route } from '@/app/routes/+types/settings.repositories._index';
import {
  GetSettingsRepositoriesDiscoveryDocument,
  GetSettingsRepositoriesDocument,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { markDeferredHandled } from '~/global/utils/markDeferredHandled';
import { repositoriesAction } from '~/routing/settings/repositories/actions/repositories';
import { RepositoriesSection } from '~/routing/settings/repositories/components/RepositoriesSection';
import { useRepositoriesDiscovery } from '~/routing/settings/repositories/hooks/useRepositoriesDiscovery';
import { buildRepositoriesView } from '~/routing/settings/repositories/utils/buildRepositoriesView';
import { shouldRevalidateRepositories } from '~/routing/settings/repositories/utils/revalidation';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Repositories',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

/**
 * @description Awaits only the registered repositories and picker capabilities — database reads,
 * milliseconds — and streams the on-disk scans (worktree discovery and workspace folders) as a
 * naked promise. Discovery shells out to git for every worktree and was the whole of this page's
 * load time (~1.4s measured, OT plan 625b9a9c), so the table must not wait for it.
 *
 * Search, sort, paging and the show-missing toggle are applied in the component, not here: they
 * are views over data the page already has (see `buildRepositoriesView`).
 */
export const loader = async (args: Route.LoaderArgs) => {
  // Both requests start before the first await so nothing waterfalls.
  const fast = executeGraphqlWithAuth(
    args.request,
    GetSettingsRepositoriesDocument,
  );
  // Deliberately not .catch()-ed: a rejection is what the page's discovery notice renders from.
  const discovery = executeGraphqlWithAuth(
    args.request,
    GetSettingsRepositoriesDiscoveryDocument,
  );
  // Before the first await, so a scan failing while `fast` is in flight — or `fast` throwing and
  // nothing being returned — cannot surface as an unhandled rejection.
  markDeferredHandled([discovery]);

  const data = await fast;

  return {
    discovery,
    pickerCapabilities: data.workspacePickerCapabilities,
    workspaceRepositories: data.workspaceRepositories,
  };
};

/**
 * @description Search, sort, paging and show-missing are client-side views, so changing only those
 * never re-runs the loader; actions and explicit rescans still do. See
 * `shouldRevalidateRepositories`.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (args) => {
  return shouldRevalidateRepositories(args);
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `Repositories | Settings | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData, matches: _m, params: _p } = props;
  const { discovery, pickerCapabilities, workspaceRepositories } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();
  const discoveryState = useRepositoriesDiscovery({ promise: discovery });
  const view = React.useMemo(() => {
    const isResolved = discoveryState.status === 'resolved';
    return buildRepositoriesView({
      discoveredWorktrees: isResolved
        ? discoveryState.value.discoveredWorktrees
        : null,
      repositories: workspaceRepositories,
      searchParams,
    });
  }, [discoveryState, searchParams, workspaceRepositories]);

  // Setup
  const scan =
    discoveryState.status === 'resolved' ? discoveryState.value : null;
  const actionError =
    actionData && 'error' in actionData ? actionData.error : null;
  const addedFolder =
    actionData && 'addedFolder' in actionData ? actionData.addedFolder : null;
  const refreshed =
    actionData && 'refreshed' in actionData ? actionData.refreshed : null;
  const pruned =
    actionData && 'pruned' in actionData ? actionData.pruned : null;
  const removal =
    actionData && 'removal' in actionData ? actionData.removal : null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <RepositoriesSection
        actionError={actionError}
        addedFolder={addedFolder}
        discoveredFolders={scan?.discoveredFolders ?? []}
        discoveredWorktrees={scan?.discoveredWorktrees ?? null}
        discoveryStatus={discoveryState.status}
        pickerCapabilities={pickerCapabilities}
        pruned={pruned}
        refreshed={refreshed}
        removal={removal}
        view={view}
      />
    </GlobalScreen>
  );
}

export const action = repositoriesAction;

export const ErrorBoundary = GlobalErrorBoundary;
