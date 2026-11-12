/**
 * @description String literals written to `plan_output_stream.kind` (CHECK-constrained nullable TEXT,
 * migration 156). The SQL CHECK and this object must list the same values.
 * @public
 */

/**
 * Which producer wrote an output chunk: the OT Loop job (`loop`), the agent CLI worker (`worker`),
 * a tool call (`tool`) or a validation run (`validation`).
 * @public
 */
export const PLAN_OUTPUT_STREAM_KIND = {
  LOOP: 'loop',
  TOOL: 'tool',
  VALIDATION: 'validation',
  WORKER: 'worker',
} as const;

/**
 * The allowed `kind` values, in the order the CHECK lists them.
 * @public
 */
export const PLAN_OUTPUT_STREAM_KINDS = [
  PLAN_OUTPUT_STREAM_KIND.LOOP,
  PLAN_OUTPUT_STREAM_KIND.WORKER,
  PLAN_OUTPUT_STREAM_KIND.TOOL,
  PLAN_OUTPUT_STREAM_KIND.VALIDATION,
] as const;
