/**
 * @description Server-side static catalog of curated MCP connectors (plan 09568a86).
 *
 * The single source the `mcpConnectors` query reads from; connection rows
 * (mcp_connector_connections) reference entries by their stable `key`. Kept
 * dependency-free and easily extendable beyond the initial ten — add an entry
 * and it flows to the catalog query with no other change. No TS enums (as-const).
 */

import type { McpConnectorAuthType } from '@openthrottle/nestjs-repositories';

/** Registry/host each connector is sourced from. */
export const MCP_CONNECTOR_PROVIDERS = [
  'anthropic-directory',
  'mcp-registry',
  'vendor-remote',
] as const;

/** Source registry/host of a catalog connector. */
export type McpConnectorProvider = (typeof MCP_CONNECTOR_PROVIDERS)[number];

/** Transport the connector's MCP server speaks. */
export const MCP_CONNECTOR_TRANSPORTS = [
  'local-stdio',
  'remote-http',
  'remote-sse',
] as const;

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

/**
 * The curated top-10, alphabetized by key. Provider spread: 6 anthropic-directory,
 * 2 vendor-remote, 2 mcp-registry. Auth spread: 8 oauth, 2 api_token.
 */
export const MCP_CONNECTOR_CATALOG: readonly McpConnectorCatalogEntry[] = [
  {
    authType: 'oauth',
    category: 'Project management',
    description:
      'Jira and Confluence — issues, pages, and project context from Atlassian.',
    docsUrl: 'https://www.atlassian.com/platform/remote-mcp-server',
    endpointUrl: 'https://mcp.atlassian.com/v1/sse',
    iconHint: 'atlassian',
    key: 'atlassian',
    name: 'Atlassian',
    provider: 'anthropic-directory',
    transport: 'remote-sse',
  },
  {
    authType: 'oauth',
    category: 'Design',
    description:
      'Read Figma designs and Dev Mode context for design-to-code workflows.',
    docsUrl: 'https://help.figma.com/hc/en-us/articles/32132100833559',
    endpointUrl: 'https://mcp.figma.com/mcp',
    iconHint: 'figma',
    key: 'figma',
    name: 'Figma',
    provider: 'vendor-remote',
    transport: 'remote-http',
  },
  {
    authType: 'oauth',
    category: 'Development',
    description:
      'Repositories, issues, and pull requests via the official GitHub MCP server.',
    docsUrl: 'https://github.com/github/github-mcp-server',
    endpointUrl: 'https://api.githubcopilot.com/mcp/',
    iconHint: 'github',
    key: 'github',
    name: 'GitHub',
    provider: 'anthropic-directory',
    transport: 'remote-http',
  },
  {
    authType: 'oauth',
    category: 'Storage',
    description:
      'Search and read Google Drive files via the reference Drive MCP server.',
    docsUrl:
      'https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive',
    endpointUrl: null,
    iconHint: 'google-drive',
    key: 'google-drive',
    name: 'Google Drive',
    provider: 'mcp-registry',
    transport: 'local-stdio',
  },
  {
    authType: 'oauth',
    category: 'Project management',
    description:
      'Linear issues, projects, and cycles from the hosted Linear MCP.',
    docsUrl: 'https://linear.app/docs/mcp',
    endpointUrl: 'https://mcp.linear.app/sse',
    iconHint: 'linear',
    key: 'linear',
    name: 'Linear',
    provider: 'anthropic-directory',
    transport: 'remote-sse',
  },
  {
    authType: 'oauth',
    category: 'Knowledge base',
    description:
      'Search and read Notion pages and databases via the hosted Notion MCP.',
    docsUrl: 'https://developers.notion.com/docs/mcp',
    endpointUrl: 'https://mcp.notion.com/mcp',
    iconHint: 'notion',
    key: 'notion',
    name: 'Notion',
    provider: 'anthropic-directory',
    transport: 'remote-http',
  },
  {
    authType: 'api_token',
    category: 'Database',
    description:
      'Read-only SQL over a Postgres database via the reference Postgres MCP server.',
    docsUrl:
      'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
    endpointUrl: null,
    iconHint: 'postgres',
    key: 'postgres',
    name: 'Postgres',
    provider: 'mcp-registry',
    transport: 'local-stdio',
  },
  {
    authType: 'oauth',
    category: 'Observability',
    description: 'Sentry issues, events, and errors via the hosted Sentry MCP.',
    docsUrl: 'https://docs.sentry.io/product/sentry-mcp/',
    endpointUrl: 'https://mcp.sentry.dev/mcp',
    iconHint: 'sentry',
    key: 'sentry',
    name: 'Sentry',
    provider: 'anthropic-directory',
    transport: 'remote-http',
  },
  {
    authType: 'oauth',
    category: 'Communication',
    description:
      'Slack channels, messages, and search — brokered via the Anthropic connector directory.',
    docsUrl: 'https://api.slack.com',
    endpointUrl: null,
    iconHint: 'slack',
    key: 'slack',
    name: 'Slack',
    provider: 'anthropic-directory',
    transport: 'remote-http',
  },
  {
    authType: 'api_token',
    category: 'Payments',
    description:
      'Stripe payments, customers, and billing via the hosted Stripe MCP (restricted API key).',
    docsUrl: 'https://docs.stripe.com/mcp',
    endpointUrl: 'https://mcp.stripe.com',
    iconHint: 'stripe',
    key: 'stripe',
    name: 'Stripe',
    provider: 'vendor-remote',
    transport: 'remote-http',
  },
];

/** Looks up a catalog entry by its stable key, or undefined when absent. */
export function findMcpConnector(
  key: string,
): McpConnectorCatalogEntry | undefined {
  return MCP_CONNECTOR_CATALOG.find((entry) => entry.key === key);
}
