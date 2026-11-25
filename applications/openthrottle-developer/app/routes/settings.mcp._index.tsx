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

import type { Route } from '@/app/routes/+types/settings.mcp._index';
import { GetSettingsMcpDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { SettingsMcpCatalog } from '~/routing/settings/components/SettingsMcpCatalog';
import { SettingsMcpIntroduction } from '~/routing/settings/components/SettingsMcpIntroduction';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'MCP',
  links: (_match) => [{ children: 'Settings', to: '/settings' }],
};

export const loader = async (args: Route.LoaderArgs) => {
  const data = await executeGraphqlWithAuth(
    args.request,
    GetSettingsMcpDocument,
    {},
  );

  return {
    connections: data.mcpConnectorConnections,
    connectors: data.mcpConnectors,
  };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `MCP connectors | Settings | ${SITE_TITLE}` }];
});

/**
 * @description The loader reads no search params, so opening or closing a
 * Manage panel (`?manage=<key>`) never refetches the catalog. Form and fetcher
 * submissions still revalidate.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (args) => {
  const { currentUrl, defaultShouldRevalidate, formMethod, nextUrl } = args;

  if (formMethod != null) {
    return defaultShouldRevalidate;
  }
  return currentUrl.pathname !== nextUrl.pathname;
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { connections, connectors } = loaderData;

  // Hooks
  const [searchParams] = useSearchParams();

  // Setup
  const manageKey = searchParams.get('manage');

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <SettingsMcpIntroduction />
      <SettingsMcpCatalog
        connections={connections}
        connectors={connectors}
        manageKey={manageKey}
      />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
