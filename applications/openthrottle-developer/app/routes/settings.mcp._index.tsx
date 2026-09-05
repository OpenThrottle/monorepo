import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import { GetSettingsMcpDocument } from '~/__generated__/graphql';
import { SettingsMcpCatalog } from '~/routing/settings/components/SettingsMcpCatalog';
import { SettingsMcpIntroduction } from '~/routing/settings/components/SettingsMcpIntroduction';
import type { Route } from '@/app/routes/+types/settings.mcp._index';

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

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { loaderData } = props;
  const { connections, connectors } = loaderData;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen beta={true}>
      <SettingsMcpIntroduction />
      <SettingsMcpCatalog connections={connections} connectors={connectors} />
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
