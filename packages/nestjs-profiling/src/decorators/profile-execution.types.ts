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
  readonly methodName?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly output?: unknown;
  readonly startTime: number;
}
