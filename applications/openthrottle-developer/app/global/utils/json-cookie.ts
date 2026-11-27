import { JSON_COOKIE_MAX_AGE_SECONDS } from '../config/json-cookie';

/**
 * @description Reads one cookie from a `Cookie` header (a request's, or
 * `document.cookie`) and returns its URI-decoded, JSON-parsed value. A missing
 * cookie or malformed JSON yields `undefined`; the caller narrows the shape.
 */
export const readJsonCookie = (cookieHeader: string, name: string): unknown => {
  const entry = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (entry == null) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(
      decodeURIComponent(entry.slice(name.length + 1)),
    );

    return parsed;
  } catch {
    return undefined;
  }
};

/**
 * @description A `document.cookie` assignment that persists `value` as URI-encoded
 * JSON for a year (`path=/`, `samesite=lax`).
 */
export const serializeJsonCookie = (name: string, value: unknown): string => {
  const encoded = encodeURIComponent(JSON.stringify(value));

  return `${name}=${encoded}; path=/; max-age=${JSON_COOKIE_MAX_AGE_SECONDS}; samesite=lax`;
};
