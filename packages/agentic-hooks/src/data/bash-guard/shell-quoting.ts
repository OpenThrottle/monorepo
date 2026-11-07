/**
 * Read a word as written (see `BashSegment.rawWords`) and tell which of its
 * characters a shell would treat as quoted.
 *
 * Used by rules about expansions that only happen to unquoted (globbing) or
 * not-single-quoted (parameter expansion) text. Static, like the lexer: it
 * never expands anything.
 *
 * @public
 */

/**
 * How one source character was quoted: `none` (bare), `escaped` (preceded by
 * a backslash outside quotes), `single` (inside `'…'` or `$'…'`) or `double`
 * (inside `"…"`). Quote characters themselves and escaping backslashes are not
 * emitted.
 *
 * @public
 */
export type QuoteState = 'double' | 'escaped' | 'none' | 'single';

/** @public */
export interface QuotedChar {
  readonly char: string;
  readonly quote: QuoteState;
}

/**
 * The characters of `raw` with their quote state, quotes removed.
 *
 * @public
 */
export const readQuotedChars = (raw: string): readonly QuotedChar[] => {
  const chars: QuotedChar[] = [];
  let quote: 'ansi' | 'double' | 'single' | null = null;
  let index = 0;
  while (index < raw.length) {
    const char = raw.charAt(index);
    const next = raw.charAt(index + 1);
    if (quote === 'single') {
      if (char === "'") quote = null;
      else chars.push({ char, quote: 'single' });
    } else if (quote === 'ansi') {
      if (char === "'") {
        quote = null;
      } else if (char === '\\' && next !== '') {
        chars.push({ char: next, quote: 'single' });
        index += 1;
      } else {
        chars.push({ char, quote: 'single' });
      }
    } else if (quote === 'double') {
      if (char === '"') {
        quote = null;
      } else if (char === '\\' && '"\\$`'.includes(next) && next !== '') {
        chars.push({ char: next, quote: 'escaped' });
        index += 1;
      } else {
        chars.push({ char, quote: 'double' });
      }
    } else if (char === "'") {
      quote = 'single';
    } else if (char === '$' && next === "'") {
      quote = 'ansi';
      index += 1;
    } else if (char === '"') {
      quote = 'double';
    } else if (char === '\\') {
      if (next !== '' && next !== '\n') {
        chars.push({ char: next, quote: 'escaped' });
      }
      index += 1;
    } else {
      chars.push({ char, quote: 'none' });
    }
    index += 1;
  }
  return chars;
};
