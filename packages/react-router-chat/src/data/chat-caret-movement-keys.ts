/** Keys that move the caret without editing, so a composer popover state is re-detected. */
export const CARET_MOVEMENT_KEYS: ReadonlySet<string> = new Set([
  'ArrowLeft',
  'ArrowRight',
  'End',
  'Home',
]);
