import { isRecord } from '@openthrottle/nodejs-utils';

import {
  CREDENTIAL_KEY_PATTERN,
  CREDENTIAL_SHAPE_PATTERNS,
  MAX_REDACTION_DEPTH,
  PEM_BEGIN_PATTERN,
  REDACTED_MARKER,
  WORD_JOINER,
} from '../render-prompt.constants.ts';

const DEFANG_PATTERN = /[$@]|(?<=^|\s)\/(?=\p{L})|<(?=[\p{L}/])/gmu;

/**
 * @description Replaces PEM key blocks in a single linear pass. A block with no END line is
 * redacted to the end of the text, which fails safe.
 */
const redactPemBlocks = (text: string): string => {
  let result = '';
  let cursor = 0;

  for (const begin of text.matchAll(PEM_BEGIN_PATTERN)) {
    if (begin.index < cursor) {
      continue;
    }

    const endMarker = text.indexOf('-----END ', begin.index);
    const endClose =
      endMarker === -1 ? -1 : text.indexOf('-----', endMarker + 9);

    result += text.slice(cursor, begin.index) + REDACTED_MARKER;
    cursor = endClose === -1 ? text.length : endClose + 5;
  }

  return result + text.slice(cursor);
};

/** @description Replaces credential-shaped substrings anywhere in free text. */
export const redactCredentialShapes = (text: string): string => {
  let result = redactPemBlocks(text);

  for (const pattern of CREDENTIAL_SHAPE_PATTERNS) {
    result = result.replace(pattern, REDACTED_MARKER);
  }

  return result;
};

/** @description True when a key or path segment names a credential. */
export const isCredentialKey = (key: string): boolean => {
  return CREDENTIAL_KEY_PATTERN.test(key);
};

/**
 * @description Copies a value with every property under a credential-looking key replaced by the
 * redaction marker. Branches deeper than the depth limit are dropped.
 */
export const redactCredentialKeys = (value: unknown, depth = 0): unknown => {
  const isArray = Array.isArray(value);

  if (!isArray && !isRecord(value)) {
    return value;
  }

  if (depth >= MAX_REDACTION_DEPTH) {
    return REDACTED_MARKER;
  }

  if (isArray) {
    return value.map((item) => redactCredentialKeys(item, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => {
      return isCredentialKey(key)
        ? [key, REDACTED_MARKER]
        : [key, redactCredentialKeys(child, depth + 1)];
    }),
  );
};

/** @description Keeps at most `maxBytes` UTF-8 bytes on a character boundary, plus a marker. */
export const truncateBytes = (
  text: string,
  maxBytes: number,
  label: string,
): string => {
  const bytes = Buffer.from(text, 'utf8');

  if (bytes.length <= maxBytes) {
    return text;
  }

  const kept = bytes.subarray(0, maxBytes).toString('utf8').replace(/�+$/u, '');
  const removed = bytes.length - Buffer.byteLength(kept, 'utf8');

  return `${kept}…[${label} ${removed} bytes]`;
};

/**
 * @description Breaks every token an agent harness could act on (`$`, `@`, a leading slash command,
 * and `<` before a letter or `/`) with U+2060.
 */
export const defang = (text: string): string => {
  return text.replace(DEFANG_PATTERN, (match) => `${match}${WORD_JOINER}`);
};
