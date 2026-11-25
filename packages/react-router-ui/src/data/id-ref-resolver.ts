import type { IdRefMatch } from '../types';

/**
 * @description Stable empty result for `useIdRefResolver` (same identity every
 * render, since callers may put `matches` in a dependency array).
 */
export const EMPTY_ID_REF_MATCHES: readonly IdRefMatch[] = [];
