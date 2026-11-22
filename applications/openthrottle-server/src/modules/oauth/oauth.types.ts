/**
 * @description Types for the OAuth authorization server routes. Design: docs/openthrottle/mcp-oauth-design.md.
 */

/** @description Resolved authorization-server configuration. */
export interface OAuthServerConfig {
  /** @description Developer-app consent page; the request id is appended as `?request=`. */
  readonly consentUrl: string;
  /** @description The issuer: openthrottle-server's public origin, no trailing slash. */
  readonly issuer: string;
  /** @description Canonical MCP URIs a token may be audience-bound to (`OT_MCP_PUBLIC_URL`). */
  readonly resources: readonly string[];
}

/** @description The authorization server is off until `OT_OAUTH_ISSUER` is set. */
export type ResolveOAuthServerConfigResult =
  | { readonly config: OAuthServerConfig; readonly kind: 'enabled' }
  | { readonly kind: 'disabled' }
  | { readonly error: string; readonly kind: 'invalid' };

/** @description The slice of an Express response the controller writes. */
export interface OAuthHttpResponse {
  json(body: unknown): unknown;
  redirect(status: number, url: string): unknown;
  setHeader(name: string, value: string): unknown;
  status(code: number): OAuthHttpResponse;
}

/** @description RFC 8414 authorization server metadata. */
export interface AuthorizationServerMetadata {
  readonly authorization_endpoint: string;
  readonly authorization_response_iss_parameter_supported: boolean;
  readonly client_id_metadata_document_supported: boolean;
  readonly code_challenge_methods_supported: readonly string[];
  readonly grant_types_supported: readonly string[];
  readonly issuer: string;
  readonly registration_endpoint: string;
  readonly response_types_supported: readonly string[];
  readonly revocation_endpoint: string;
  readonly revocation_endpoint_auth_methods_supported: readonly string[];
  readonly scopes_supported: readonly string[];
  readonly token_endpoint: string;
  readonly token_endpoint_auth_methods_supported: readonly string[];
}
