/**
 * @description Structured execution metadata, similar to MongoDB .explain() on aggregations.
 * Used for tuning and debugging (e.g. feeding to AI or writing to a file).
 */
export interface ProfileExecutionResult {
  readonly durationMs: number;
  readonly endTime: number;
  readonly error?: {
    readonly message: string;
    readonly name: string;
  };
  readonly inputs?: readonly unknown[];
  readonly label: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly methodName?: string;
  /**
   * The (redacted) return value, present only when output capture was enabled. When capture
   * is on the key is always present even for a nullish/falsy result (it may be `undefined`),
   * so an absent `output` key unambiguously means capture was disabled.
   */
  readonly output?: unknown;
  readonly startTime: number;
}
