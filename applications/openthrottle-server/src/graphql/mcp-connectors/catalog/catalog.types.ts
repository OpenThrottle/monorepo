import type { McpConnectorAuthType } from '@openthrottle/nestjs-repositories';

import type {
  MCP_CONNECTOR_PROVIDERS,
  MCP_CONNECTOR_TRANSPORTS,
} from './catalog.constants.ts';

/** Source registry/host of a catalog connector. */
export type McpConnectorProvider = (typeof MCP_CONNECTOR_PROVIDERS)[number];

/** Transport of a catalog connector's MCP server. */
export type McpConnectorTransport = (typeof MCP_CONNECTOR_TRANSPORTS)[number];

/** One curated connector's static metadata. */
export type McpConnectorCatalogEntry = {
  readonly authType: McpConnectorAuthType;
  readonly category: string;
  readonly description: string;
  readonly docsUrl: string;
  /** Remote endpoint URL, or null for local-stdio / directory-brokered connectors. */
  readonly endpointUrl: string | null;
  /** Icon hint (lucide-ish slug) for the UI to resolve; not a hard dependency. */
  readonly iconHint: string;
  /** Stable key; the FK used by mcp_connector_connections.connector_key. */
  readonly key: string;
  readonly name: string;
  readonly provider: McpConnectorProvider;
  readonly transport: McpConnectorTransport;
};
