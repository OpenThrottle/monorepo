import { MCP_CONNECTOR_CATALOG } from './catalog.constants.ts';
import type { McpConnectorCatalogEntry } from './catalog.types.ts';

/** Looks up a catalog entry by its stable key, or undefined when absent. */
export function findMcpConnector(
  key: string,
): McpConnectorCatalogEntry | undefined {
  return MCP_CONNECTOR_CATALOG.find((entry) => entry.key === key);
}
