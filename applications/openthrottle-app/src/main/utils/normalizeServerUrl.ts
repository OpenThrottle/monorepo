export type NormalizeServerUrlResult =
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly reason: string };

const MAX_URL_LENGTH = 2048;

/**
 * @description Validates untrusted input (IPC argument, settings file, env)
 * as an OpenThrottle server URL and reduces it to its origin: `http:` or
 * `https:` only, no credentials, no trailing slash, no path, query or hash.
 */
export const normalizeServerUrl = (
  input: unknown,
): NormalizeServerUrlResult => {
  if (typeof input !== 'string') {
    return { ok: false, reason: 'The server URL must be text.' };
  }

  const trimmed = input.trim();

  if (trimmed === '' || trimmed.length > MAX_URL_LENGTH) {
    return {
      ok: false,
      reason: 'Enter the address of an OpenThrottle server.',
    };
  }

  const parsed = URL.parse(trimmed);

  if (parsed === null) {
    return {
      ok: false,
      reason: 'That is not a valid URL. Try http://localhost:6021.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      ok: false,
      reason: 'The server URL must start with http:// or https://.',
    };
  }

  if (parsed.username !== '' || parsed.password !== '') {
    return {
      ok: false,
      reason: 'The server URL must not contain a username or password.',
    };
  }

  return { ok: true, url: parsed.origin };
};
