/**
 * @description Pure helpers for the OAuth authorization server routes: configuration,
 * RFC 8414 metadata, parameter reading, and redirect construction.
 */
import { OAUTH_SUPPORTED_SCOPES } from '@openthrottle/nestjs-repositories-server';
import { isRecord } from '@openthrottle/nodejs-utils';

import type {
  AuthorizationServerMetadata,
  OAuthServerConfig,
  ResolveOAuthServerConfigResult,
} from './oauth.types.ts';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost']);

/**
 * @description Canonical form of an OAuth identifier URL (issuer or resource): lowercase
 * scheme and host (the URL parser does both), no trailing slash, no query or fragment.
 * https, or http on a loopback host. Returns null when the value is unusable.
 */
export function canonicalizeOAuthUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  const isLocalHttp =
    url.protocol === 'http:' &&
    (LOOPBACK_HOSTS.has(url.hostname) || url.hostname.endsWith('.localhost'));
  if (url.protocol !== 'https:' && !isLocalHttp) {
    return null;
  }
  if (url.search !== '' || url.hash !== '') {
    return null;
  }

  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}

/**
 * @description Reads the authorization server configuration. Unset `OT_OAUTH_ISSUER`
 * leaves it off (every OAuth route answers 404). Set, it requires at least one MCP
 * resource in `OT_MCP_PUBLIC_URL` (comma-separated) and a consent URL, which defaults
 * to the developer app's `/oauth/consent`.
 */
export function resolveOAuthServerConfig(
  env: NodeJS.ProcessEnv,
): ResolveOAuthServerConfigResult {
  const rawIssuer = env.OT_OAUTH_ISSUER?.trim() ?? '';
  if (rawIssuer === '') {
    return { kind: 'disabled' };
  }

  const issuer = canonicalizeOAuthUrl(rawIssuer);
  if (issuer === null) {
    return {
      error: `OT_OAUTH_ISSUER must be an https URL (http only on loopback) with no query or fragment.`,
      kind: 'invalid',
    };
  }

  const rawResources = (env.OT_MCP_PUBLIC_URL ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '');
  const resources = rawResources.map(canonicalizeOAuthUrl);
  if (resources.length === 0 || resources.some((value) => value === null)) {
    return {
      error: `OT_OAUTH_ISSUER is set, so OT_MCP_PUBLIC_URL must name the MCP resource URL(s) tokens are issued for.`,
      kind: 'invalid',
    };
  }

  const developerUrl = (env.APP_URL_DEVELOPER ?? '').trim().replace(/\/+$/, '');
  const consentUrl =
    env.OT_OAUTH_CONSENT_URL?.trim() || `${developerUrl}/oauth/consent`;
  if (canonicalizeOAuthUrl(consentUrl) === null) {
    return {
      error: `OT_OAUTH_CONSENT_URL (or APP_URL_DEVELOPER) must resolve to the developer app's https consent page.`,
      kind: 'invalid',
    };
  }

  return {
    config: {
      consentUrl,
      issuer,
      resources: resources.filter((value) => value !== null),
    },
    kind: 'enabled',
  };
}

/**
 * @description The RFC 8414 document served at `/.well-known/oauth-authorization-server`.
 */
export function buildAuthorizationServerMetadata(
  config: OAuthServerConfig,
): AuthorizationServerMetadata {
  return {
    authorization_endpoint: `${config.issuer}/oauth/authorize`,
    authorization_response_iss_parameter_supported: true,
    client_id_metadata_document_supported: true,
    code_challenge_methods_supported: ['S256'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    issuer: config.issuer,
    registration_endpoint: `${config.issuer}/oauth/register`,
    response_types_supported: ['code'],
    revocation_endpoint: `${config.issuer}/oauth/revoke`,
    revocation_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [...OAUTH_SUPPORTED_SCOPES],
    token_endpoint: `${config.issuer}/oauth/token`,
    token_endpoint_auth_methods_supported: ['none'],
  };
}

/**
 * @description Reads one string parameter from a query or form body. A repeated
 * parameter is an error in OAuth (RFC 6749 §3.1), so arrays read as null.
 */
export function readOAuthParam(source: unknown, name: string): string | null {
  if (!isRecord(source)) {
    return null;
  }
  const value = source[name];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * @description Reads a string-array member of a JSON body (DCR), or null when absent or malformed.
 */
export function readOAuthStringArray(
  source: unknown,
  name: string,
): string[] | null {
  if (!isRecord(source)) {
    return null;
  }
  const value = source[name];
  if (!Array.isArray(value)) {
    return null;
  }
  const strings = value.filter((item): item is string => {
    return typeof item === 'string';
  });
  return strings.length === value.length ? strings : null;
}

/**
 * @description Appends authorization-response parameters to a validated redirect URI,
 * always including `iss` (RFC 9207). Null values are omitted.
 */
export function buildAuthorizationRedirect(
  redirectUri: string,
  params: Readonly<Record<string, string | null>>,
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * @description The host a consent screen should show for a client: the CIMD URL's host,
 * else the client_uri host, else the first redirect URI's host or scheme.
 */
export function describeClientHost(client: {
  readonly clientId: string;
  readonly clientUri: string | null;
  readonly redirectUris: readonly string[];
}): string {
  const candidates = [
    client.clientId,
    client.clientUri,
    client.redirectUris[0],
  ];
  for (const candidate of candidates) {
    if (candidate == null) {
      continue;
    }
    try {
      const url = new URL(candidate);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.host;
      }
      return `${url.protocol}//`;
    } catch {
      continue;
    }
  }
  return 'unknown client';
}
