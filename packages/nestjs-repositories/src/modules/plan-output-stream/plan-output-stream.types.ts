/**
 * @description Types for the plan_output_stream module.
 */

import type { PLAN_OUTPUT_STREAM_KIND } from './plan-output-stream.constants.ts';

/** @public */
export type PlanOutputStreamKind =
  (typeof PLAN_OUTPUT_STREAM_KIND)[keyof typeof PLAN_OUTPUT_STREAM_KIND];
