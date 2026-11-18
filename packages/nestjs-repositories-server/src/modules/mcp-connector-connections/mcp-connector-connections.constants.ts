/**
 * Auth mechanism a connector uses, denormalized onto the connection row at connect time.
 * `as const` (no TS enum); mirrors the catalog seed's authType.
 * @public
 */
export const MCP_CONNECTOR_AUTH_TYPES = ['api_token', 'oauth'] as const;
