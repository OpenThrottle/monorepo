/**
 * @description Count a file's lines the way ESLint's `max-lines` does, so the
 * shape audits and the lint rule can never disagree about a cap.
 * `content.split('\n').length` counts the empty segment after a final newline
 * as an extra line, which made every compliant 210-line file read as 211.
 */

/** ESLint's line-break pattern (`lib/shared/ast-utils.js`). */
const LINE_BREAK = /\r\n|[\r\n\u2028\u2029]/u;

/**
 * Number of lines in `content`, matching ESLint `max-lines` with
 * `skipBlankLines: false, skipComments: false`: `\r\n` is one break, and a
 * trailing line break does not start another line.
 */
export const countLines = (content: string): number => {
  const lines = content.split(LINE_BREAK);

  return lines.length > 1 && lines.at(-1) === ''
    ? lines.length - 1
    : lines.length;
};
