/**
 * Env var: force the native folder picker on (`1`/`true`/`on`) or off
 * (`0`/`false`/`off`). Unset/other falls through to the computed default.
 */
export const NATIVE_PICKER_ENV = 'OPENTHROTTLE_NATIVE_PICKER';

/** Max wall-clock for a native folder dialog before the child is killed. */
export const NATIVE_DIALOG_TIMEOUT_MS = 2 * 60 * 1000;
