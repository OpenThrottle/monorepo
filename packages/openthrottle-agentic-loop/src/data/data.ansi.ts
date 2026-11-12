const ESC = String.fromCharCode(27);

/** @description Complete CSI escape sequence (colors, cursor movement, erase). */
export const ANSI_PATTERN = new RegExp(`${ESC}\\[[0-9;?]*[ -/]*[@-~]`, 'g');

/** @description A trailing, still-incomplete CSI escape sequence at the end of a text chunk. */
export const ANSI_PARTIAL_TAIL_PATTERN = new RegExp(
  `${ESC}(?:\\[[0-9;?]*[ -/]*)?$`,
);

/** @description Env that asks well-behaved tools not to emit color. */
export const UNCOLORED_ENV = { FORCE_COLOR: '0', NO_COLOR: '1' } as const;
