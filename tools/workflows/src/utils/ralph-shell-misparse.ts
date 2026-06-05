/**
 * @description Mitigations for finding #1 of plan 65a8dd25 ("Harden cross-repo plan runs"):
 * cursor-agent's Shell tool can pass multiline prose (e.g. a post-task inventory block emitted
 * right after `<ralph:task-complete>`) to `/bin/sh`, where each newline becomes a separate
 * command and the shell emits a token / "command not found" error per line. workflow-ralph then
 * echoes the entire agent result via `console.log(result)` in `parseRalphResponse`, surfacing
 * that spam to the LoggerService / run output stream.
 *
 * Since this is cursor-agent shell semantics rather than an OpenThrottle queue bug, we mitigate at
 * the OpenThrottle boundary in two complementary ways:
 *  1. `WORKFLOW_PROMPT_SHELL_COMMAND_GUARDRAIL` — prompt guardrail telling
 *     the agent never to feed multiline prose to the Shell tool and to
 *     emit completion signals as plain text.
 *  2. {@link sanitizeRalphShellNoise} — collapse repeated `/bin/sh` misparse error lines into a
 *     single attributable summary before echoing, so the run output stays readable.
 */

/**
 * @description Matches ANSI SGR color escapes so they can be stripped before line classification.
 * Built from `String.fromCharCode(27)` (ESC) to avoid a literal control character in source (which
 * trips `no-control-regex`).
 */
const ANSI_SGR_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/**
 * @description Matches a single `/bin/sh` (or `/bin/bash`) misparse error line (after ANSI stripping
 * and leading whitespace). Deliberately scoped to the absolute shell path so it does not collapse
 * legitimate prose that merely mentions `sh:`.
 */
const SHELL_MISPARSE_LINE_REGEX = /^\s*\/bin\/(?:sh|bash):\s/;

/** Result of {@link sanitizeRalphShellNoise}. */
export interface SanitizeRalphShellNoiseResult {
  /** Number of consecutive runs of `/bin/sh` error lines that were collapsed. */
  readonly collapsedBlockCount: number;
  /** The output with `/bin/sh` misparse error runs collapsed into summary lines. */
  readonly sanitized: string;
  /** Total number of `/bin/sh` error lines that were removed. */
  readonly suppressedLineCount: number;
}

/**
 * @description Builds the single summary line that replaces a collapsed run of `/bin/sh` errors.
 */
const buildSummaryLine = (lineCount: number): string =>
  `[workflow-ralph] suppressed ${lineCount} /bin/sh command-misparse line(s) (cursor-agent Shell tool passed multiline prose to the shell; see plan 65a8dd25 finding #1)`;

/**
 * @description Collapses consecutive `/bin/sh` / `/bin/bash` misparse error lines into a single
 * attributable summary line. Non-matching lines (including Ralph signal tags) are preserved exactly,
 * so this is safe to run before echoing the agent result; marker detection should still operate on
 * the original, unsanitized result.
 */
export const sanitizeRalphShellNoise = (
  result: string,
): SanitizeRalphShellNoiseResult => {
  if (result === '') {
    return { collapsedBlockCount: 0, sanitized: '', suppressedLineCount: 0 };
  }

  const lines = result.split('\n');
  const out: string[] = [];

  let collapsedBlockCount = 0;
  let suppressedLineCount = 0;
  let runLength = 0;

  const flushRun = (): void => {
    if (runLength === 0) return;
    out.push(buildSummaryLine(runLength));
    collapsedBlockCount += 1;
    suppressedLineCount += runLength;
    runLength = 0;
  };

  for (const line of lines) {
    if (SHELL_MISPARSE_LINE_REGEX.test(line.replace(ANSI_SGR_REGEX, ''))) {
      runLength += 1;
    } else {
      flushRun();
      out.push(line);
    }
  }
  flushRun();

  return {
    collapsedBlockCount,
    sanitized: out.join('\n'),
    suppressedLineCount,
  };
};
