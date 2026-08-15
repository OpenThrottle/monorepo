/**
 * @description Envelope-agnostic readers for the JSON that React Router route
 * `action`s return to `useFetcher` / `useActionData`. OpenThrottle actions
 * conventionally shape this as `{ ok: true, ... }` on success and
 * `{ ok: false, error: string }` on failure, but a number of older actions
 * omit `ok` and return a looser `{ error?: string }`. These helpers read both.
 *
 * This is deliberately **not** GraphQL-transport parsing — `{ data, errors }`
 * unwrapping lives in `@openthrottle/react-router-graphql`
 * (`executeGraphqlWithAuth`). Keep this module free of GraphQL imports.
 */

/**
 * A route action's failure envelope: `ok: false` with a human-readable error.
 */
export interface ActionFailure {
  readonly error: string;
  readonly ok: false;
}

/**
 * A route action's success envelope: `ok: true` plus any payload fields.
 */
export type ActionSuccess<TData = unknown> = { readonly ok: true } & TData;

/**
 * Discriminated union for actions that adopt the `{ ok }` envelope. Actions
 * that omit `ok` (returning a bare `{ error?: string }`) are still readable via
 * {@link getActionError}, which does not require the discriminant.
 */
export type ActionResult<TData = unknown> =
  ActionFailure | ActionSuccess<TData>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object';

/**
 * @public
 * @description Reads a non-empty string `error` field off an action result,
 * regardless of whether the result carries the `ok` discriminant. Returns
 * `undefined` for nullish input, non-objects, a missing/empty `error`, or a
 * non-string `error`. Call sites that need `null` (rather than `undefined`)
 * write `getActionError(data) ?? null`.
 */
export const getActionError = (data: unknown): string | undefined => {
  if (!isRecord(data) || !('error' in data)) {
    return undefined;
  }
  const value = data.error;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

/**
 * @public
 * @description Narrows an action result to {@link ActionFailure} — an object
 * with `ok === false` carrying a non-empty string `error`.
 */
export const isActionFailure = (data: unknown): data is ActionFailure =>
  isRecord(data) &&
  data.ok === false &&
  typeof data.error === 'string' &&
  data.error.length > 0;

/**
 * @public
 * @description True when an action result is the success envelope
 * (`ok === true`). Mirrors the `'ok' in data && data.ok === true` checks that
 * gate revalidation / success toasts.
 */
export const isActionSuccess = (data: unknown): boolean =>
  isRecord(data) && data.ok === true;
