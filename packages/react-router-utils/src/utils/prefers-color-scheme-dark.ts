import { PREFERS_DARK_QUERY } from '../config/color-scheme';

/** Read the current OS dark preference; false on the server (no `matchMedia`). */
export const prefersColorSchemeDark = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(PREFERS_DARK_QUERY).matches;
