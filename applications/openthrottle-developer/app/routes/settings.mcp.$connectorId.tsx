import * as React from 'react';
import { z } from 'zod/v3';
import {
  coerceBoolean,
  executeGraphqlWithAuth,
  parseFormData,
} from '@openthrottle/react-router-graphql';
import {
  getActionError,
  mergeRouteModuleMeta,
} from '@openthrottle/react-router-utils';
import type { GlobalLayoutBreadcrumbsHandle } from '@openthrottle/react-router-ui-global';
import {
  GlobalErrorBoundary,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { Link } from 'react-router';
import { SITE_TITLE } from '~/global/config/settings';
import { toErrorMessage } from '~/global/utils/utils.error-message';
import { ConnectMcpConnectorInputSchema } from '~/__generated__/schemas';
import {
  ConnectMcpConnectorDocument,
  DisconnectMcpConnectorDocument,
  GetSettingsMcpDocument,
  SetMcpConnectorEnabledDocument,
} from '~/__generated__/graphql';
import { SettingsMcpConnectForm } from '~/routing/settings/components/SettingsMcpConnectForm';
import { SettingsMcpConnectionActions } from '~/routing/settings/components/SettingsMcpConnectionActions';
import { SettingsMcpSetupDocs } from '~/routing/settings/components/SettingsMcpSetupDocs';
import type { SettingsMcpActionData } from '~/routing/settings/utils/settings-mcp-action';
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
  const connectorParsed = parseFormData(
    formData,
    z.object({ connectorKey: z.string().min(1) }),
    { strict: false },
  );

  if (!connectorParsed.success) {
    return { error: 'Connector is required.' };
  }
  const connectorKey = connectorParsed.data.connectorKey;

  if (intent === 'connect') {
    const parsed = parseFormData(
      formData,
      ConnectMcpConnectorInputSchema().omit({ connectorKey: true }),
      { strict: false },
    );
    if (!parsed.success) {
      return { error: parsed.error };
    }

    try {
      const data = await executeGraphqlWithAuth(
        args.request,
        ConnectMcpConnectorDocument,
        {
          input: {
            apiToken: parsed.data.apiToken ?? null,
            connectorKey,
            label: parsed.data.label ?? null,
          },
        },
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
    const enabledParsed = parseFormData(
      formData,
      z.object({ enabled: coerceBoolean(z.boolean()).nullish() }),
      { strict: false },
    );
    const enabled = enabledParsed.success
      ? (enabledParsed.data.enabled ?? false)
      : false;
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
