/**
 * Presence states. `installed` and `not_found` are claims about the user's machine;
 * `unknown` is the honest answer whenever we are not entitled to make one.
 *
 * @public
 */
export const EDITOR_PRESENCE_STATES = [
  'installed',
  'not_found',
  'unknown',
] as const;
