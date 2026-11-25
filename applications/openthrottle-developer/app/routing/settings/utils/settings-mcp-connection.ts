/**
 * @description Pure helpers for the MCP connectors catalog UI: index a user's
 * connections by connector key, derive a connector's connection status, and
 * group the catalog by provider for display.
 */

import { formatDistanceStrict } from 'date-fns';

import type {
  McpConnectorConnectionFieldsFragment,
  McpConnectorFieldsFragment,
} from '~/__generated__/graphql';
import {
  MCP_PROVIDER_DISPLAY,
  MCP_PROVIDER_FALLBACK_LABEL,
  MCP_PROVIDER_FALLBACK_ORDER,
} from '~/routing/settings/data/mcp-connectors';

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

  const providerOrder = (provider: string): number => {
    return MCP_PROVIDER_DISPLAY[provider]?.order ?? MCP_PROVIDER_FALLBACK_ORDER;
  };

  return [...byProvider.entries()]
    .sort(([a], [b]) => providerOrder(a) - providerOrder(b))
    .map(([provider, groupConnectors]) => ({
      connectors: groupConnectors,
      label: getProviderLabel(provider),
      provider,
    }));
}

/** A catalog connector paired with the current user's connection to it. */
export interface McpConnectedConnector {
  readonly connection: McpConnectorConnectionFieldsFragment;
  readonly connector: McpConnectorFieldsFragment;
}

/** The catalog split into what the user has connected and what they could add. */
export interface McpConnectorPartition {
  readonly available: readonly McpConnectorFieldsFragment[];
  readonly connected: readonly McpConnectedConnector[];
}

/**
 * @description Splits the catalog into connected and available connectors, both
 * in provider display order (see {@link groupConnectorsByProvider}).
 */
export function partitionConnectors(
  connectors: readonly McpConnectorFieldsFragment[],
  connections: readonly McpConnectorConnectionFieldsFragment[],
): McpConnectorPartition {
  const connectionByKey = indexConnectionsByKey(connections);
  const ordered = groupConnectorsByProvider(connectors).flatMap(
    (group) => group.connectors,
  );
  const connected: McpConnectedConnector[] = [];
  const available: McpConnectorFieldsFragment[] = [];
  for (const connector of ordered) {
    const connection = connectionByKey.get(connector.key);
    if (connection) {
      connected.push({ connection, connector });
    } else {
      available.push(connector);
    }
  }
  return { available, connected };
}

/** Formats a timestamp as "3 days ago", or null when it is missing or invalid. */
export function formatTimeAgo(
  value: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  if (date.getTime() >= now.getTime()) {
    return 'just now';
  }
  return `${formatDistanceStrict(date, now, { roundingMethod: 'floor' })} ago`;
}

/** One-line summary for a connected row: "Connected 3 days ago · last used 2 hours ago". */
export function getConnectionSummary(
  connection: McpConnectorConnectionFieldsFragment,
  now: Date = new Date(),
): string {
  const connectedAgo = formatTimeAgo(connection.connectedAt, now);
  const lastUsedAgo = formatTimeAgo(connection.lastUsedAt, now);
  const parts = [
    connection.enabled ? null : 'Disabled',
    connectedAgo ? `Connected ${connectedAgo}` : 'Connected',
    lastUsedAgo ? `last used ${lastUsedAgo}` : 'not used yet',
  ];
  return parts.filter((part) => part !== null).join(' · ');
}
