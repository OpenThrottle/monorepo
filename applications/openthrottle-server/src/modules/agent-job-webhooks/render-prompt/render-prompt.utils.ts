import { randomBytes } from 'node:crypto';

import { fillTemplate } from '@openthrottle/nodejs-utils';

import {
  FORBIDDEN_PATH_SEGMENTS,
  MAX_PLACEHOLDER_LENGTH,
  MAX_PROMPT_BYTES,
  MAX_VALUE_BYTES,
  NONCE_BYTES,
  PREAMBLE_TEMPLATE,
  PROMPT_MARKER_RESERVE_BYTES,
  REDACTED_MARKER,
} from './render-prompt.constants.ts';
import type {
  RenderedWebhookPrompt,
  RenderWebhookPromptInput,
} from './render-prompt.types.ts';
import {
  defang,
  isCredentialKey,
  redactCredentialKeys,
  redactCredentialShapes,
  truncateBytes,
} from './sanitize/sanitize.utils.ts';

const hasOwn = (target: object, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(target, key);
};

const SOURCE_DISALLOWED = /[^A-Za-z0-9._:-]/g;

/** @description A fresh 16-byte hex nonce for one request. */
export const generateWebhookNonce = (): string => {
  return randomBytes(NONCE_BYTES).toString('hex');
};

/** @description Walks an own-property path; prototype-ish and missing segments resolve to nothing. */
const resolvePath = (root: unknown, path: string): unknown => {
  let current = root;

  for (const segment of path.split('.')) {
    if (
      segment === '' ||
      FORBIDDEN_PATH_SEGMENTS.has(segment) ||
      typeof current !== 'object' ||
      current === null ||
      !hasOwn(current, segment)
    ) {
      return undefined;
    }

    current = Reflect.get(current, segment);
  }

  return current;
};

/** @description Stringify, redact, truncate and defang one value (steps 1-4). */
const sanitizeValue = (value: unknown, credentialPath: boolean): string => {
  if (value === undefined) {
    return '';
  }

  if (credentialPath) {
    return REDACTED_MARKER;
  }

  const json = JSON.stringify(redactCredentialKeys(value), null, 2) ?? '';
  const text = typeof value === 'string' ? value : json;

  return defang(
    truncateBytes(redactCredentialShapes(text), MAX_VALUE_BYTES, 'truncated'),
  );
};

const wrap = (nonce: string, source: string, body: string): string => {
  const safeSource = source.replace(SOURCE_DISALLOWED, '');

  return `<webhook-data-${nonce} source="${safeSource}">${body}</webhook-data-${nonce}>`;
};

/** @description Renders one placeholder body, or null when it is not a placeholder. */
const renderPlaceholder = (
  body: string,
  input: RenderWebhookPromptInput,
  nonce: string,
): string | null => {
  const name = body.trim();

  if (name === 'payload') {
    return wrap(nonce, name, sanitizeValue(input.payload, false));
  }

  if (/\s/.test(name)) {
    return null;
  }

  if (name.startsWith('payload.') && name.length > 'payload.'.length) {
    const path = name.slice('payload.'.length);
    const value = resolvePath(input.payload, path);

    return wrap(
      nonce,
      name,
      sanitizeValue(value, path.split('.').some(isCredentialKey)),
    );
  }

  if (name.startsWith('header.') && name.length > 'header.'.length) {
    const headerName = name.slice('header.'.length).toLowerCase();
    const value = hasOwn(input.headers, headerName)
      ? input.headers[headerName]
      : undefined;

    return wrap(nonce, name, sanitizeValue(value, isCredentialKey(headerName)));
  }

  return null;
};

/**
 * @description Single pass over the trusted template: placeholders are replaced, the substituted
 * text is appended and never scanned again. Unknown or unterminated `{{…}}` stay literal.
 */
const expandTemplate = (
  input: RenderWebhookPromptInput,
  nonce: string,
): string => {
  const { template } = input;
  let output = '';
  let cursor = 0;

  while (cursor < template.length) {
    const open = template.indexOf('{{', cursor);

    if (open === -1) {
      break;
    }

    const close = template.indexOf('}}', open + 2);
    const body = close === -1 ? null : template.slice(open + 2, close);
    const isPlaceholder =
      body !== null && body.length <= MAX_PLACEHOLDER_LENGTH;
    const rendered = isPlaceholder
      ? renderPlaceholder(body, input, nonce)
      : null;

    if (rendered === null || close === -1) {
      output += template.slice(cursor, open + 2);
      cursor = open + 2;
    } else {
      output += template.slice(cursor, open) + rendered;
      cursor = close + 2;
    }
  }

  return output + template.slice(cursor);
};

/**
 * @description Renders a job's prompt template from a webhook payload: nonce-framed, defanged,
 * truncated and redacted data blocks behind a fixed preamble. `prompt` and `renderedPrompt` are
 * the same text; it is already redacted, so it is safe to store on the delivery row.
 * `generateNonce` exists so tests can pin the nonce; production uses the random default.
 */
export const renderWebhookPrompt = (
  input: RenderWebhookPromptInput,
  generateNonce: () => string = generateWebhookNonce,
): RenderedWebhookPrompt => {
  const nonce = generateNonce();
  const preamble = fillTemplate(PREAMBLE_TEMPLATE, { nonce });
  const full = `${preamble}\n\n${expandTemplate(input, nonce)}`;
  const prompt = truncateBytes(
    full,
    MAX_PROMPT_BYTES - PROMPT_MARKER_RESERVE_BYTES,
    'prompt truncated',
  );

  return { prompt, renderedPrompt: prompt };
};
