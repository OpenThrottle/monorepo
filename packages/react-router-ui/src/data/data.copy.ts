/**
 * @description Headings for the palette's escape-hatch group. `noMatch` is
 * only true when no static row matched the query; `more` heads the same rows
 * when something above them did.
 */
export const COMMANDER_ESCAPE_HEADING = {
  more: 'More',
  noMatch: 'No match in palette — open a route or search',
  search: 'Search',
} as const;
