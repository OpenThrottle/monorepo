export interface SplitMatchHighlightOptions {
  /** Engine-reported 1-based column where the match starts. */
  column: number;
  /** The full line of text. */
  lineText: string;
  /** The matched substring to highlight. */
  matchText: string;
}

/** The three segments of a line around a matched substring. */
export interface HighlightSegments {
  /** The matched substring (empty when no match was located). */
  mid: string;
  /** Text after the match. */
  post: string;
  /** Text before the match (the whole line when no match was located). */
  pre: string;
}

/**
 * Split `lineText` into the segments before/at/after the matched substring, so a
 * renderer can wrap the middle in a highlight. Prefers the 1-based `column`; falls
 * back to the first occurrence of `matchText` when the column doesn't line up.
 * Returns the whole line as `pre` (empty `mid`) when nothing matches.
 *
 * @public
 */
export const splitMatchHighlight = (
  options: SplitMatchHighlightOptions,
): HighlightSegments => {
  const { column, lineText, matchText } = options;
  const start = column - 1;
  const fitsAtColumn =
    start >= 0 && lineText.slice(start, start + matchText.length) === matchText;
  const index = fitsAtColumn ? start : lineText.indexOf(matchText);

  if (matchText === '' || index < 0) {
    return { mid: '', post: '', pre: lineText };
  }

  return {
    mid: lineText.slice(index, index + matchText.length),
    post: lineText.slice(index + matchText.length),
    pre: lineText.slice(0, index),
  };
};
