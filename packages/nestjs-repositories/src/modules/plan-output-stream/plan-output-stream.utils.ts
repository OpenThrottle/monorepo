/**
 * @description Helpers for the plan_output_stream `kind` column.
 */

import { PLAN_OUTPUT_STREAM_KINDS } from './plan-output-stream.constants.ts';

/**
 * @description Type predicate narrowing an arbitrary string to a valid `kind`.
 * @public
 */
export const isPlanOutputStreamKind = (
  value: string,
): value is (typeof PLAN_OUTPUT_STREAM_KINDS)[number] => {
  return PLAN_OUTPUT_STREAM_KINDS.some((kind) => kind === value);
};
