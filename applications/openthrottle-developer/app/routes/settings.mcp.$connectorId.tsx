import * as React from 'react';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { mergeRouteModuleMeta } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { Link } from 'react-router';
import { SITE_TITLE } from '~/global/config/settings';
import { toErrorMessage } from '~/global/utils/utils.error-message';
import {
  ConnectMcpConnectorDocument,
  DisconnectMcpConnectorDocument,
  GetSettingsMcpDocument,
  SetMcpConnectorEnabledDocument,
} from '~/__generated__/graphql';
import { SettingsMcpConnectForm } from '~/routing/settings/components/SettingsMcpConnectForm';
import { SettingsMcpConnectionActions } from '~/routing/settings/components/SettingsMcpConnectionActions';
import { SettingsMcpSetupDocs } from '~/routing/settings/components/SettingsMcpSetupDocs';
import {
  parseApiTokenFromFormData,
  parseConnectorKeyFromFormData,
  parseEnabledFromFormData,
  parseLabelFromFormData,
  type SettingsMcpActionData,
} from '~/routing/settings/utils/settings-mcp-action';
import type { Route } from '@/app/routes/+types/settings.mcp.$connectorId';

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

export const meta: Route.MetaFunction = mergeRouteModuleMeta((_args) => {
  return [{ title: `MCP connector | ${SITE_TITLE}` }];
});

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData, loaderData } = props;
  const { connection, connector } = loaderData;

  // Setup
  const actionError =
    actionData && 'error' in actionData ? actionData.error : null;

  // Markup
  if (!connector) {
    return (
      <GlobalScreen>
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
    <GlobalScreen>
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
        {connection ? (
          <SettingsMcpConnectionActions
            connection={connection}
            connector={connector}
          />
        ) : null}
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
  const formData = await args.request.formData();
  const intent = formData.get('intent');
  const connectorKey = parseConnectorKeyFromFormData(
    formData.get('connectorKey'),
  );

  if (!connectorKey) {
    return { error: 'Connector is required.' };
  }

  if (intent === 'connect') {
    const apiToken = parseApiTokenFromFormData(formData.get('apiToken'));
    const label = parseLabelFromFormData(formData.get('label'));

    try {
      const data = await executeGraphqlWithAuth(
        args.request,
        ConnectMcpConnectorDocument,
        { input: { apiToken, connectorKey, label } },
      );
      return {
        connection: data.connectMcpConnector.connection,
        intent: 'connect',
      };
    } catch (error) {
      return { error: toErrorMessage(error, 'Failed to connect.') };
    }
  }

  if (intent === 'setEnabled') {
    const enabled = parseEnabledFromFormData(formData.get('enabled'));
    try {
      await executeGraphqlWithAuth(
        args.request,
        SetMcpConnectorEnabledDocument,
        { input: { connectorKey, enabled } },
      );
      return { ok: true };
    } catch (error) {
      return { error: toErrorMessage(error, 'Failed to update connection.') };
    }
  }

  if (intent === 'disconnect') {
    try {
      await executeGraphqlWithAuth(
        args.request,
        DisconnectMcpConnectorDocument,
        { connectorKey },
      );
      return { ok: true };
    } catch (error) {
      return { error: toErrorMessage(error, 'Failed to disconnect.') };
    }
  }

  throw new Error('Invalid intent');
};

export const ErrorBoundary = GlobalErrorBoundary;
