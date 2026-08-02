import * as React from 'react';
import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import {
  groupConnectorsByProvider,
  indexConnectionsByKey,
} from '~/routing/settings/utils/settings-mcp-connection';
import { SettingsMcpConnectorCard } from './SettingsMcpConnectorCard';

export interface SettingsMcpCatalogProps {
  connections: readonly McpConnectorConnectionFieldsFragment[];
  connectors: readonly McpConnectorFieldsFragment[];
}

export const SettingsMcpCatalog = (
  props: SettingsMcpCatalogProps,
): React.ReactElement => {
  const { connections, connectors } = props;

  // Hooks

  // Setup
  const connectionByKey = indexConnectionsByKey(connections);
  const groups = groupConnectorsByProvider(connectors);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-8" data-testid="SettingsMcpCatalog">
      {groups.map((group) => (
        <section key={group.provider}>
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">
            {group.label}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.connectors.map((connector) => (
              <SettingsMcpConnectorCard
                connection={connectionByKey.get(connector.key)}
                connector={connector}
                key={connector.key}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
