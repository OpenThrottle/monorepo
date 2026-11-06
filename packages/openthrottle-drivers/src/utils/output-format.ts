/**
 * @description Output-format vocabulary for a plan-run invocation. `text` is what every driver
 * except claude has always emitted, and stays the default so a caller that does not opt in cannot
 * receive NDJSON it does not know how to read. `structured` asks the CLI for its machine-readable
 * stream (the same flag the chat composer's argv builders use), which is what a run transcript is
 * built from. Opting in is only safe through a caller that also installs a matching `parseOutput`
 * and `renderOutputLine` — `withStructuredOutput` in `@openthrottle/openthrottle-agentic-utils` —
 * because Ralph reads its `<promise>…</promise>` markers from the recovered text.
 */

import type { DriverInvocationConfig } from '../types/index.ts';

/**
 * @description The output formats a driver invocation can request.
 * @public
 */
export const DRIVER_OUTPUT_FORMATS = {
  structured: 'structured',
  text: 'text',
} as const;

/**
 * @description One of the {@link DRIVER_OUTPUT_FORMATS} values.
 * @public
 */
export type DriverOutputFormat =
  (typeof DRIVER_OUTPUT_FORMATS)[keyof typeof DRIVER_OUTPUT_FORMATS];

/**
 * @description Returns ` <flag>` when the invocation asked for structured output, `''` otherwise,
 * so a driver splices its CLI's structured-output flag in without branching.
 * @public
 */
export const structuredOutputShellFlag = (
  config: DriverInvocationConfig,
  flag: string,
): string => {
  const isStructured = config.outputFormat === DRIVER_OUTPUT_FORMATS.structured;

  return isStructured ? ` ${flag}` : '';
};
