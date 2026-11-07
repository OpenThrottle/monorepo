/**
 * @description ANSI/VT control sequences: CSI (`ESC [ … final`), OSC
 * (`ESC ] … BEL` or `ESC ] … ESC \`) and single-char escapes. Every
 * alternative is anchored on the ESC byte, so a bare `[0m` the installer
 * printed literally is left alone. Ported from agentic-utils
 * `cursor-agent/errors.ts`, which is node-side and must not reach the client
 * bundle.
 */
/* eslint-disable no-control-regex -- matching terminal escapes is the entire point */
const ANSI_PATTERN =
  /\u001b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g;
/* eslint-enable no-control-regex */

/**
 * @description Remove terminal escape sequences from installer output.
 */
export const stripAnsi = (text: string): string => {
  return text.replace(ANSI_PATTERN, '');
};

/**
 * @description Resolve `\r` progress redraws on one line to the last
 * non-empty write, which is what a terminal leaves on screen once the
 * redraws stop.
 */
const collapseCarriageReturns = (line: string): string => {
  if (!line.includes('\r')) {
    return line;
  }
  const writes = line.split('\r').filter((write) => write.length > 0);
  return writes.at(-1) ?? '';
};

/**
 * @description Turn raw agent install/update chunk text into displayable
 * text: strip ANSI escapes, normalize CRLF, collapse `\r` redraws and drop
 * trailing blank lines.
 */
export const sanitizeAgentSetupLog = (raw: string): string => {
  const lines = stripAnsi(raw)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(collapseCarriageReturns);

  while (lines.length > 0 && (lines.at(-1) ?? '').trim() === '') {
    lines.pop();
  }

  return lines.join('\n');
};
