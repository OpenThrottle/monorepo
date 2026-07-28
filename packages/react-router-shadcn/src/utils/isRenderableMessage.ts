import * as React from 'react';

/**
 * @public
 * @description True when `value` would render visible content: a non-whitespace
 * `string`, a `number`/`bigint` React will print, or a valid React element.
 * Everything else — `null`/`undefined`, booleans, plain objects, functions,
 * symbols — is non-renderable and returns `false`.
 *
 * This is the single source of truth for "is this message worth surfacing?".
 * The Sonner toast guard and the in-app notifications store both consume it, so
 * a blank/whitespace/non-renderable message can never surface an empty toast nor
 * a phantom notification row/badge/announcement. An allowlist (rather than a
 * broad `typeof !== 'string'` check) keeps genuine rich ReactNode content intact.
 */
export const isRenderableMessage = (value: unknown): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return true;
  }
  return React.isValidElement(value);
};
