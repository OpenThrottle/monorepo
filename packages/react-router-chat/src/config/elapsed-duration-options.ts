import type { FormatDurationOptions } from '@openthrottle/nodejs-utils';

/** @description How the Running section shows the ticking turn time: `42s`, `3m 05s`, `1h 02m`. */
export const ELAPSED_DURATION_OPTIONS = {
  padded: true,
  rounding: 'floor',
} satisfies FormatDurationOptions;
