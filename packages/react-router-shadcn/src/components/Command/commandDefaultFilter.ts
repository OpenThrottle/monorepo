import { defaultFilter } from 'cmdk';

/** Signature of a cmdk `filter`: a score in [0, 1] for one row; 0 hides it. */
export type CommandFilter = typeof defaultFilter;

/**
 * @public
 * @description cmdk's built-in fuzzy scorer, for a custom `filter` that
 * re-ranks a few rows and delegates every other row to the default scoring.
 */
export const commandDefaultFilter: CommandFilter = defaultFilter;
