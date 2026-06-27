/**
 * @description SSRF guard for web URL loading. Validates that a caller-supplied
 * URL uses an http(s) scheme and does not target a loopback, private,
 * link-local, or otherwise-reserved host. Callers that accept user input MUST
 * run untrusted URLs through {@link assertSafeWebURL} (or {@link isSafeWebURL})
 * before fetching.
 *
 * NOTE: This validates the URL's literal host only. It does NOT resolve DNS, so
 * a hostname that resolves to a private address (DNS-rebinding) is not caught
 * here. For fully untrusted input, fetch through an egress proxy / allowlist in
 * addition to this check.
 */

const ALLOWED_PROTOCOLS: readonly string[] = ['http:', 'https:'];

const BLOCKED_HOSTNAMES: readonly string[] = [
  '0.0.0.0',
  '127.0.0.1',
  '[::1]',
  '[::]',
  'ip6-localhost',
  'ip6-loopback',
  'localhost',
  'metadata',
  'metadata.google.internal',
];

/**
 * @publicApi
 * @description Reason a URL was rejected, or `null` when the URL is considered
 * safe to fetch.
 */
export function getWebURLRejectionReason(url: string): string | null {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    return `URL is not parseable: ${url}`;
  }

  const protocol = parsed.protocol.toLowerCase();

  if (!ALLOWED_PROTOCOLS.includes(protocol)) {
    return `Disallowed scheme "${protocol}" (only http/https are permitted)`;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (hostname.length === 0) {
    return 'URL has no host';
  }

  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return `Host "${hostname}" resolves to a loopback/metadata endpoint`;
  }

  // *.localhost and bare single-label hosts (e.g. internal service names) are
  // treated as internal and rejected.
  if (hostname.endsWith('.localhost')) {
    return `Host "${hostname}" is a localhost alias`;
  }

  if (isPrivateIPv4(hostname)) {
    return `Host "${hostname}" is a private/reserved IPv4 address`;
  }

  if (isPrivateIPv6(hostname)) {
    return `Host "${hostname}" is a private/reserved IPv6 address`;
  }

  return null;
}

/**
 * @publicApi
 * @description Returns true when the URL is safe to fetch (http/https scheme and
 * a non-internal host).
 */
export function isSafeWebURL(url: string): boolean {
  return getWebURLRejectionReason(url) === null;
}

/**
 * @publicApi
 * @description Throws when the URL is unsafe to fetch. Use to fail loudly on
 * untrusted input before handing the URL to a network loader.
 */
export function assertSafeWebURL(url: string): void {
  const reason = getWebURLRejectionReason(url);

  if (reason !== null) {
    throw new Error(`Refusing to load unsafe URL: ${reason}`);
  }
}

function isPrivateIPv4(hostname: string): boolean {
  const octets = hostname.split('.');

  if (octets.length !== 4) {
    return false;
  }

  const parsed = octets.map((octet) => Number.parseInt(octet, 10));

  if (parsed.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = parsed;

  // 0.0.0.0/8 — "this" network
  if (first === 0) {
    return true;
  }

  // 10.0.0.0/8 — private
  if (first === 10) {
    return true;
  }

  // 127.0.0.0/8 — loopback
  if (first === 127) {
    return true;
  }

  // 169.254.0.0/16 — link-local (includes cloud metadata 169.254.169.254)
  if (first === 169 && second === 254) {
    return true;
  }

  // 172.16.0.0/12 — private
  if (first === 172 && second >= 16 && second <= 31) {
    return true;
  }

  // 192.168.0.0/16 — private
  if (first === 192 && second === 168) {
    return true;
  }

  return false;
}

function isPrivateIPv6(hostname: string): boolean {
  // URL hostnames bracket IPv6 literals: [::1], [fc00::1], etc.
  const stripped = hostname.replace(/^\[/, '').replace(/\]$/, '');

  if (!stripped.includes(':')) {
    return false;
  }

  const normalized = stripped.toLowerCase();

  // ::1 loopback and :: unspecified
  if (normalized === '::1' || normalized === '::') {
    return true;
  }

  // fc00::/7 — unique local addresses
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  // fe80::/10 — link-local
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  // IPv4-mapped IPv6 in dotted form (::ffff:a.b.c.d).
  const dottedMatch = normalized.match(
    /::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/,
  );

  if (dottedMatch !== null) {
    return isPrivateIPv4(dottedMatch[1]);
  }

  // IPv4-mapped IPv6 that the URL parser compressed to hex (::ffff:a00:1 etc).
  const hexMatch = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);

  if (hexMatch !== null) {
    const high = Number.parseInt(hexMatch[1], 16);
    const low = Number.parseInt(hexMatch[2], 16);
    const dotted = `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;

    return isPrivateIPv4(dotted);
  }

  return false;
}
