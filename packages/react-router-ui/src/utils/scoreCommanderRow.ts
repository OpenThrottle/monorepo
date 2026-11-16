import type { CommandFilter } from '@openthrottle/react-router-shadcn';
import { commandDefaultFilter } from '@openthrottle/react-router-shadcn';

import { COMMANDER_ESCAPE_ROW_KEYWORD } from '../data/data.commander';

/**
 * @description cmdk `filter` for the command palette. cmdk sorts rows and
 * groups by score, so render order alone cannot put "Search for …" first: a
 * fallback row whose value starts with the query outscores it. Rows marked
 * with a {@link COMMANDER_ESCAPE_ROW_KEYWORD} get fixed tiny scores — ranked
 * leading → Search → fallback, and below every row that genuinely matched.
 * Everything else keeps cmdk's default fuzzy score.
 *
 * Markers live in keywords rather than a per-render lookup because cmdk can
 * score with the previous render's `filter` (child effects run first).
 */
export const scoreCommanderRow: CommandFilter = (value, search, keywords) => {
  if (keywords?.includes(COMMANDER_ESCAPE_ROW_KEYWORD.leading)) {
    return 0.003;
  }
  if (keywords?.includes(COMMANDER_ESCAPE_ROW_KEYWORD.search)) {
    return 0.002;
  }
  if (keywords?.includes(COMMANDER_ESCAPE_ROW_KEYWORD.fallback)) {
    return 0.001;
  }

  return commandDefaultFilter(value, search, keywords);
};
