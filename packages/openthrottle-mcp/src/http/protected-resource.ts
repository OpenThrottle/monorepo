/**
 * @description Public-mode configuration for the streamable-HTTP MCP server, and the
 * OAuth 2.0 Protected Resource Metadata (RFC 9728) it serves in that mode.
 *
 * Public mode is switched on by `OT_MCP_PUBLIC_URL` — the server's canonical URI as
 * MCP clients address it (e.g. `https://mcp.example.com/mcp`). In public mode the
 * server is an OAuth resource server: a request with no bearer is refused with a 401
 * naming the metadata document, instead of silently running as the container's
 * `OPENTHROTTLE_MCP_AUTH_TOKEN` service account. Design:
 * docs/openthrottle/mcp-oauth-design.md.
 */

/**
 * @description The scopes a public-mode MCP client can request. `mcp:write` implies `mcp:read`.
 * @public
 */
export const MCP_OAUTH_SCOPES = ['mcp:read', 'mcp:write'] as const;

const PRM_WELL_KNOWN = '/.well-known/oauth-protected-resource';

/**
 * @description The compose-internal server: no OAuth, header-less requests run as the env service account.
 * @public
 */
export interface McpInternalAuthMode {
  readonly kind: 'internal';
}

/**
 * @description The publicly reachable server: an OAuth 2.1 resource server.
 * @public
 */
export interface McpPublicAuthMode {
  /** @description Deprecated escape hatch: header-less requests fall back to the env service-account token. */
  readonly allowStaticToken: boolean;
  /** @description The authorization server's issuer URL (`OT_OAUTH_ISSUER`). */
  readonly issuer: string;
  readonly kind: 'public';
  /** @description The canonical MCP URI, e.g. `https://mcp.example.com/mcp`. */
  readonly resource: string;
}

/**
 * @description How the HTTP MCP server authenticates requests.
 * @public
 */
export type McpHttpAuthMode = McpInternalAuthMode | McpPublicAuthMode;

/**
 * @description The result of {@link resolveMcpHttpAuthMode}: a mode, or a configuration error to fail boot with.
 * @public
 */
export type ResolveMcpHttpAuthModeResult =
  | { readonly mode: McpHttpAuthMode; readonly ok: true }
  | { readonly error: string; readonly ok: false };

/**
 * @description The RFC 9728 Protected Resource Metadata document.
 * @public
 */
export interface ProtectedResourceMetadata {
  readonly authorization_servers: readonly string[];
  readonly bearer_methods_supported: readonly string[];
  readonly resource: string;
  readonly resource_name: string;
  readonly scopes_supported: readonly string[];
}

const readEnv = (env: NodeJS.ProcessEnv, name: string): string => {
  return env[name]?.trim() ?? '';
};

const isLoopbackHost = (hostname: string): boolean => {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.localhost')
  );
};

/**
 * @description Parses an absolute URL for use as an OAuth identifier: https (or http on
 * a loopback host, for local development), no fragment, no query, no trailing slash.
 * Returns the canonical string, or an error message.
 */
const canonicalizeIdentifierUrl = (
  name: string,
  raw: string,
):
  | { readonly ok: true; readonly url: string }
  | { readonly error: string; readonly ok: false } => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return {
      error: `${name} must be an absolute URL (got "${raw}").`,
      ok: false,
    };
  }

  const isHttps = parsed.protocol === 'https:';
  const isLocalHttp =
    parsed.protocol === 'http:' && isLoopbackHost(parsed.hostname);

  if (!isHttps && !isLocalHttp) {
    return {
      error: `${name} must use https (http is allowed only on a loopback host); got "${raw}".`,
      ok: false,
    };
  }

  if (parsed.hash !== '' || parsed.search !== '') {
    return {
      error: `${name} must not carry a query or fragment; got "${raw}".`,
      ok: false,
    };
  }

  const path = parsed.pathname.replace(/\/+$/, '');

  return { ok: true, url: `${parsed.origin}${path}` };
};

/**
 * @description Reads public-mode configuration from the environment. Unset
 * `OT_MCP_PUBLIC_URL` is the compose-internal server and changes nothing. Set, it
 * requires `OT_OAUTH_ISSUER`, because the metadata must name an authorization server.
 * @public
 */
export const resolveMcpHttpAuthMode = (
  env: NodeJS.ProcessEnv,
): ResolveMcpHttpAuthModeResult => {
  const rawResource = readEnv(env, 'OT_MCP_PUBLIC_URL');

  if (rawResource === '') {
    return { mode: { kind: 'internal' }, ok: true };
  }

  const resource = canonicalizeIdentifierUrl('OT_MCP_PUBLIC_URL', rawResource);
  if (!resource.ok) {
    return resource;
  }

  const rawIssuer = readEnv(env, 'OT_OAUTH_ISSUER');
  if (rawIssuer === '') {
    return {
      error: `OT_MCP_PUBLIC_URL is set, so OT_OAUTH_ISSUER (the openthrottle-server public origin) is required.`,
      ok: false,
    };
  }

  const issuer = canonicalizeIdentifierUrl('OT_OAUTH_ISSUER', rawIssuer);
  if (!issuer.ok) {
    return issuer;
  }

  return {
    mode: {
      allowStaticToken: readEnv(env, 'OT_MCP_ALLOW_STATIC_TOKEN') === 'true',
      issuer: issuer.url,
      kind: 'public',
      resource: resource.url,
    },
    ok: true,
  };
};

/**
 * @description The request paths that serve the metadata document: the RFC 9728
 * path-suffixed form for the resource's path (`/.well-known/oauth-protected-resource/mcp`)
 * and the bare form, which some clients probe first.
 * @public
 */
export const getProtectedResourceMetadataPaths = (
  mode: McpPublicAuthMode,
): readonly string[] => {
  const resourcePath = new URL(mode.resource).pathname.replace(/\/+$/, '');

  if (resourcePath === '') {
    return [PRM_WELL_KNOWN];
  }

  return [`${PRM_WELL_KNOWN}${resourcePath}`, PRM_WELL_KNOWN];
};

/**
 * @description The absolute URL of the metadata document, as named in `WWW-Authenticate`.
 * @public
 */
export const getProtectedResourceMetadataUrl = (
  mode: McpPublicAuthMode,
): string => {
  const origin = new URL(mode.resource).origin;
  const [path] = getProtectedResourceMetadataPaths(mode);

  return `${origin}${path ?? PRM_WELL_KNOWN}`;
};

/**
 * @description Builds the RFC 9728 document. `offline_access` is deliberately absent
 * (the spec says a resource SHOULD NOT advertise it).
 * @public
 */
export const buildProtectedResourceMetadata = (
  mode: McpPublicAuthMode,
  resourceName: string,
): ProtectedResourceMetadata => {
  return {
    authorization_servers: [mode.issuer],
    bearer_methods_supported: ['header'],
    resource: mode.resource,
    resource_name: resourceName,
    scopes_supported: [...MCP_OAUTH_SCOPES],
  };
};

/**
 * @description The `WWW-Authenticate` value for a 401 (RFC 6750 §3 + RFC 9728 §5.1).
 * @public
 */
export const buildUnauthorizedChallenge = (mode: McpPublicAuthMode): string => {
  const metadataUrl = getProtectedResourceMetadataUrl(mode);

  return `Bearer resource_metadata="${metadataUrl}", scope="${MCP_OAUTH_SCOPES.join(' ')}"`;
};
