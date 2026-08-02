/**
 * @description Pure helpers for the MCP connectors catalog UI: index a user's
 * connections by connector key, derive a connector's connection status, and
 * group the catalog by provider for display.
 */

import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import {
  MCP_PROVIDER_DISPLAY,
  MCP_PROVIDER_FALLBACK_LABEL,
  MCP_PROVIDER_FALLBACK_ORDER,
} from '~/routing/settings/data/mcp-connectors.data';

/** A connector's connection state from the current user's perspective. */
export type McpConnectorStatus = 'disabled' | 'disconnected' | 'enabled';

/** A provider group of catalog connectors, ready to render. */
export type McpConnectorProviderGroup = {
  connectors: McpConnectorFieldsFragment[];
  label: string;
  provider: string;
};

/** Builds a `connectorKey -> connection` lookup from the user's connections. */
export function indexConnectionsByKey(
  connections: readonly McpConnectorConnectionFieldsFragment[],
): Map<string, McpConnectorConnectionFieldsFragment> {
  return new Map(
    connections.map((connection) => [connection.connectorKey, connection]),
  );
}

/** Derives the status for a connector from its connection (or lack of one). */
export function getConnectorStatus(
  connection: McpConnectorConnectionFieldsFragment | undefined,
): McpConnectorStatus {
  if (!connection) {
    return 'disconnected';
  }
  return connection.enabled ? 'enabled' : 'disabled';
}

/** Resolves the display label for a provider key. */
export function getProviderLabel(provider: string): string {
  return MCP_PROVIDER_DISPLAY[provider]?.label ?? MCP_PROVIDER_FALLBACK_LABEL;
}

/**
 * @description Groups catalog connectors by provider, ordered by the provider's
 * configured display order (unknown providers sort last), preserving each
 * group's incoming connector order.
 */
export function groupConnectorsByProvider(
  connectors: readonly McpConnectorFieldsFragment[],
): McpConnectorProviderGroup[] {
  const byProvider = new Map<string, McpConnectorFieldsFragment[]>();
  for (const connector of connectors) {
    const group = byProvider.get(connector.provider) ?? [];
    group.push(connector);
    byProvider.set(connector.provider, group);
  }

  const providerOrder = (provider: string): number =>
    MCP_PROVIDER_DISPLAY[provider]?.order ?? MCP_PROVIDER_FALLBACK_ORDER;

  return [...byProvider.entries()]
    .sort(([a], [b]) => providerOrder(a) - providerOrder(b))
    .map(([provider, groupConnectors]) => ({
      connectors: groupConnectors,
      label: getProviderLabel(provider),
      provider,
    }));
}
