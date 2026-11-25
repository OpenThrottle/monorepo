import { Button } from '@openthrottle/react-router-shadcn';
import { ExternalLinkIcon, RefreshCwIcon } from 'lucide-react';
import * as React from 'react';
import { Link, useFetcher } from 'react-router';

import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import {
  MCP_AUTH_TYPE_LABEL,
  MCP_CATALOG_COPY,
  MCP_FACT_EMPTY,
  MCP_TRANSPORT_LABEL,
} from '~/routing/settings/data/mcp-connectors';
import type { SettingsMcpActionData } from '~/routing/settings/utils/settings-mcp-action';
import { formatTimeAgo } from '~/routing/settings/utils/settings-mcp-connection';

export interface SettingsMcpManagePanelProps {
  readonly connection: McpConnectorConnectionFieldsFragment;
  readonly connector: McpConnectorFieldsFragment;
}

export const SettingsMcpManagePanel = (
  props: SettingsMcpManagePanelProps,
): React.ReactElement => {
  const { connection, connector } = props;

  // Hooks
  const fetcher = useFetcher<SettingsMcpActionData>();

  // Setup
  const isApiToken = connector.authType === 'api_token';
  const authLabel =
    MCP_AUTH_TYPE_LABEL[connector.authType] ?? connector.authType;
  const tokenHint = connection.credentialLabel ?? connection.credentialPrefix;
  const credential = tokenHint ? `${authLabel} · ${tokenHint}` : authLabel;
  const facts = [
    { label: MCP_CATALOG_COPY.factCredential, value: credential },
    {
      label: MCP_CATALOG_COPY.factTransport,
      value: MCP_TRANSPORT_LABEL[connector.transport] ?? connector.transport,
    },
    {
      label: MCP_CATALOG_COPY.factEndpoint,
      value: connector.endpointUrl ?? MCP_CATALOG_COPY.brokeredEndpoint,
    },
    {
      label: MCP_CATALOG_COPY.factConnected,
      value: formatTimeAgo(connection.connectedAt) ?? MCP_FACT_EMPTY,
    },
    {
      label: MCP_CATALOG_COPY.factLastUsed,
      value: formatTimeAgo(connection.lastUsedAt) ?? MCP_CATALOG_COPY.neverUsed,
    },
  ];
  const reconnectLabel = isApiToken
    ? MCP_CATALOG_COPY.updateToken
    : MCP_CATALOG_COPY.reconnect;
  const actionError =
    fetcher.data && 'error' in fetcher.data ? fetcher.data.error : null;
  const isDisconnecting = fetcher.state !== 'idle';

  // Handlers

  // Markup
  const errorMarkup = (
    <p
      className="text-destructive px-4 pb-3 text-sm"
      data-testid="SettingsMcpManagePanel-error"
      role="alert"
    >
      {actionError}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="border-t" data-testid="SettingsMcpManagePanel">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4 text-sm md:grid-cols-3">
        {facts.map((fact) => (
          <div className="min-w-0" key={fact.label}>
            <dt className="text-muted-foreground text-xs">{fact.label}</dt>
            <dd className="truncate" title={fact.value}>
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>
      {actionError ? errorMarkup : null}
      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
        <Button asChild={true} size="sm" variant="outline">
          <Link
            data-testid="SettingsMcpManagePanel-reconnect"
            to={`/settings/mcp/${connector.key}`}
          >
            <RefreshCwIcon />
            {reconnectLabel}
          </Link>
        </Button>
        <Button asChild={true} size="sm" variant="ghost">
          <a href={connector.docsUrl} rel="noreferrer" target="_blank">
            <ExternalLinkIcon />
            {MCP_CATALOG_COPY.docs}
          </a>
        </Button>
        <fetcher.Form
          action={`/settings/mcp/${connector.key}`}
          className="ml-auto"
          method="post"
        >
          <input name="intent" type="hidden" value="disconnect" />
          <input name="connectorKey" type="hidden" value={connector.key} />
          <Button
            className="text-destructive"
            data-testid="SettingsMcpManagePanel-disconnect"
            disabled={isDisconnecting}
            size="sm"
            type="submit"
            variant="ghost"
          >
            {MCP_CATALOG_COPY.disconnect}
          </Button>
        </fetcher.Form>
      </div>
    </div>
  );
};
