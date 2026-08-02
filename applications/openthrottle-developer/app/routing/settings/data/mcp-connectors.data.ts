/**
 * @description Display metadata for the MCP connectors catalog: provider group
 * labels/order and auth/transport human labels. Pure data (no components).
 * Keyed as Record<string, …> so lookups need no type assertions.
 */

/** Display label + sort order for a catalog provider group. */
export interface McpProviderDisplay {
  label: string;
  order: number;
}

/** Display label + sort order for each catalog provider group. */
export const MCP_PROVIDER_DISPLAY: Record<string, McpProviderDisplay> = {
  'anthropic-directory': {
    label: 'Anthropic connector directory',
    order: 0,
  },
  'mcp-registry': {
    label: 'Official MCP registry',
    order: 1,
  },
  'vendor-remote': {
    label: 'Vendor-hosted remote MCP',
    order: 2,
  },
};

/** Human label for a connector's auth type. */
export const MCP_AUTH_TYPE_LABEL: Record<string, string> = {
  api_token: 'API token',
  oauth: 'OAuth',
};

/** Human label for a connector's transport. */
export const MCP_TRANSPORT_LABEL: Record<string, string> = {
  'local-stdio': 'Local (stdio)',
  'remote-http': 'Remote (HTTP)',
  'remote-sse': 'Remote (SSE)',
};

/** Fallback provider label for an unknown/unmapped provider key. */
export const MCP_PROVIDER_FALLBACK_LABEL = 'Other';

/** Sort order used for providers not present in {@link MCP_PROVIDER_DISPLAY}. */
export const MCP_PROVIDER_FALLBACK_ORDER = Number.MAX_SAFE_INTEGER;
