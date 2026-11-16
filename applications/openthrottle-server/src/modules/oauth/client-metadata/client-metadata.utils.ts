/**
 * @description Pure helpers for Client ID Metadata Documents: which client_ids are
 * metadata URLs, which addresses the fetcher may connect to, and document validation.
 */
import { BlockList, isIP } from 'node:net';

import { isRegistrableRedirectUri } from '@openthrottle/nestjs-repositories';
import { isRecord } from '@openthrottle/nodejs-utils';

import type { ParseClientMetadataDocumentResult } from './client-metadata.types.ts';

const buildBlockedAddresses = (): BlockList => {
  const list = new BlockList();
  const ipv4: readonly (readonly [string, number])[] = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
  ];
  const ipv6: readonly (readonly [string, number])[] = [
    ['::', 128],
    ['::1', 128],
    ['64:ff9b::', 96],
    ['100::', 64],
    ['2001:db8::', 32],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8],
  ];
  ipv4.forEach(([network, prefix]) => list.addSubnet(network, prefix, 'ipv4'));
  ipv6.forEach(([network, prefix]) => list.addSubnet(network, prefix, 'ipv6'));
  return list;
};

const blockedAddresses = buildBlockedAddresses();

const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};

const readOptionalString = (
  source: Record<string, unknown>,
  name: string,
): string | null => {
  const value = source[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
};

/**
 * @description Whether a client_id is a Client ID Metadata Document URL: https, default
 * port, a non-root path, no query, fragment or credentials, no dot segments.
 */
export function isMetadataDocumentClientId(clientId: string): boolean {
  if (!clientId.startsWith('https://')) {
    return false;
  }
  let url: URL;
  try {
    url = new URL(clientId);
  } catch {
    return false;
  }
  const hasDotSegment = /\/\.\.?(\/|$)/.test(clientId.slice('https://'.length));
  return (
    url.protocol === 'https:' &&
    url.port === '' &&
    url.pathname !== '/' &&
    url.search === '' &&
    url.hash === '' &&
    url.username === '' &&
    url.password === '' &&
    !hasDotSegment &&
    url.toString() === clientId
  );
}

/**
 * @description Whether the fetcher may connect to a resolved address. Loopback, private,
 * link-local, CGNAT, documentation, multicast and reserved ranges are refused; an
 * IPv4-mapped IPv6 address is judged by its IPv4 part.
 */
export function isFetchableAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  const candidate = mapped?.[1] ?? address;
  const family = isIP(candidate);
  if (family === 0) {
    return false;
  }
  return !blockedAddresses.check(candidate, family === 4 ? 'ipv4' : 'ipv6');
}

/**
 * @description Validates a fetched metadata document against the URL it was fetched from.
 * Only public clients are accepted (`token_endpoint_auth_method` absent or `none`).
 */
export function parseClientMetadataDocument(
  body: string,
  url: string,
): ParseClientMetadataDocumentResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { error: 'The client metadata document is not JSON.', ok: false };
  }
  if (!isRecord(parsed)) {
    return {
      error: 'The client metadata document is not a JSON object.',
      ok: false,
    };
  }

  if (parsed.client_id !== url) {
    return {
      error: `The client metadata document's client_id must equal its URL.`,
      ok: false,
    };
  }

  const authMethod = parsed.token_endpoint_auth_method;
  if (authMethod !== undefined && authMethod !== 'none') {
    return {
      error: `Only public clients are supported (token_endpoint_auth_method "none").`,
      ok: false,
    };
  }

  const rawRedirects = parsed.redirect_uris;
  const redirectUris = Array.isArray(rawRedirects)
    ? rawRedirects.filter(isString)
    : [];
  const allValid =
    Array.isArray(rawRedirects) &&
    redirectUris.length === rawRedirects.length &&
    redirectUris.length > 0 &&
    redirectUris.every(isRegistrableRedirectUri);
  if (!allValid) {
    return {
      error: `redirect_uris must be a non-empty list of https, loopback http or private-use URIs.`,
      ok: false,
    };
  }

  return {
    document: {
      clientId: url,
      clientName: readOptionalString(parsed, 'client_name'),
      clientUri: readOptionalString(parsed, 'client_uri'),
      logoUri: readOptionalString(parsed, 'logo_uri'),
      redirectUris,
    },
    ok: true,
  };
}
