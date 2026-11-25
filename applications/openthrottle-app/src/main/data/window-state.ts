/** File inside `app.getPath('userData')` holding the last window bounds. */
export const WINDOW_STATE_FILE_NAME = 'window-state.json';

/** Current `window-state.json` schema version. */
export const WINDOW_STATE_VERSION = 1;

/** How long after the last resize or move the bounds are written. */
export const WINDOW_STATE_SAVE_DELAY_MS = 400;

/** Pixels of the window that must overlap a display for it to count as visible. */
export const MIN_VISIBLE_PIXELS = 64;
