import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import * as React from 'react';
import { Link } from 'react-router';

import type { Route } from '@/app/routes/+types/settings.mcp.$connectorId';
import { GetSettingsMcpDocument } from '~/__generated__/graphql';
import { SITE_TITLE } from '~/global/config/settings';
import { runMcpConnectorAction } from '~/routing/settings/actions/runMcpConnectorAction';
import { SettingsMcpConnectForm } from '~/routing/settings/components/SettingsMcpConnectForm';
import { SettingsMcpConnectionActions } from '~/routing/settings/components/SettingsMcpConnectionActions';
import { SettingsMcpSetupDocs } from '~/routing/settings/components/SettingsMcpSetupDocs';
import type { SettingsMcpActionData } from '~/routing/settings/utils/settings-mcp-action';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Connector',
  links: (_match) => [
    { children: 'Settings', to: '/settings' },
    { children: 'MCP', to: '/settings/mcp' },
  ],
};

export const loader = async (args: Route.LoaderArgs) => {
  const connectorId = args.params.connectorId;
  const data = await executeGraphqlWithAuth(
    args.request,
    GetSettingsMcpDocument,
    {},
  );

  const connector =
    data.mcpConnectors.find((entry) => entry.key === connectorId) ?? null;
  const connection =
    data.mcpConnectorConnections.find(
      (entry) => entry.connectorKey === connectorId,
    ) ?? null;

  return { connection, connector };
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta: Route.MetaFunction = mergeRouteModuleMeta((args) => {
  const name = args.loaderData?.connector?.name ?? 'Connector';
  return [{ title: `${name} | MCP | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData } = props;
  const { connection, connector } = loaderData;

  // Hooks

  // Setup
  const actionError = getActionError(actionData) ?? null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!connector) {
    return (
      <GlobalScreen beta={true}>
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">Unknown connector.</p>
          <Link className="text-sm underline" to="/settings/mcp">
            Back to MCP connectors
          </Link>
        </div>
      </GlobalScreen>
    );
  }

  return (
    <GlobalScreen beta={true}>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">{connector.name}</h1>
          <Link
            className="text-muted-foreground text-sm underline"
            to="/settings/mcp"
          >
            Back to MCP connectors
          </Link>
        </div>
        <SettingsMcpSetupDocs connector={connector} />
        {connection && (
          <SettingsMcpConnectionActions
            connection={connection}
            connector={connector}
          />
        )}
        <SettingsMcpConnectForm
          actionError={actionError}
          connector={connector}
          isConnected={connection != null}
        />
      </div>
    </GlobalScreen>
  );
}

export const action = async (
  args: Route.ActionArgs,
): Promise<SettingsMcpActionData> => {
  return runMcpConnectorAction(args);
};

export const ErrorBoundary = GlobalErrorBoundary;
