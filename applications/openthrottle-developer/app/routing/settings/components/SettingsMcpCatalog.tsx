import * as React from 'react';

import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import { MCP_CATALOG_COPY } from '~/routing/settings/data/mcp-connectors';
import { partitionConnectors } from '~/routing/settings/utils/settings-mcp-connection';

import { SettingsMcpAvailableChip } from './SettingsMcpAvailableChip';
import { SettingsMcpConnectedRow } from './SettingsMcpConnectedRow';

export interface SettingsMcpCatalogProps {
  readonly connections: readonly McpConnectorConnectionFieldsFragment[];
  readonly connectors: readonly McpConnectorFieldsFragment[];
  readonly manageKey: string | null;
}

export const SettingsMcpCatalog = (
  props: SettingsMcpCatalogProps,
): React.ReactElement => {
  const { connections, connectors, manageKey } = props;

  // Hooks

  // Setup
  const { available, connected } = partitionConnectors(connectors, connections);

  // Handlers

  // Markup
  const connectedEmpty = (
    <p
      className="text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-sm"
      data-testid="SettingsMcpCatalog-connectedEmpty"
    >
      {MCP_CATALOG_COPY.connectedEmpty}
    </p>
  );
  const connectedList = (
    <ul className="flex flex-col gap-2">
      {connected.map((entry) => (
        <SettingsMcpConnectedRow
          connection={entry.connection}
          connector={entry.connector}
          isOpen={entry.connector.key === manageKey}
          key={entry.connector.key}
        />
      ))}
    </ul>
  );
  const availableSection = (
    <section aria-labelledby="settings-mcp-available">
      <h2
        className="text-muted-foreground mb-3 text-sm font-medium"
        id="settings-mcp-available"
      >
        {MCP_CATALOG_COPY.availableHeading} · {available.length}
      </h2>
      <div className="flex flex-wrap gap-2">
        {available.map((connector) => (
          <SettingsMcpAvailableChip connector={connector} key={connector.key} />
        ))}
      </div>
    </section>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (connectors.length === 0) {
    return <div data-testid="SettingsMcpCatalog" />;
  }

  return (
    <div className="flex flex-col gap-8" data-testid="SettingsMcpCatalog">
      <section aria-labelledby="settings-mcp-connected">
        <h2
          className="text-muted-foreground mb-3 text-sm font-medium"
          id="settings-mcp-connected"
        >
          {MCP_CATALOG_COPY.connectedHeading} · {connected.length}
        </h2>
        {connected.length > 0 ? connectedList : connectedEmpty}
      </section>
      {available.length > 0 ? availableSection : null}
    </div>
  );
};
