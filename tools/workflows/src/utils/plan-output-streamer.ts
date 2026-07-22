/**
 * @description Serializes plan-output appends so chunks land in `plan_output_stream`
 * in emission order, retries transient append failures a bounded number of times, and
 * tracks ultimate failures so a job can surface lost output instead of reporting a
 * silent success. Replaces the previous fire-and-forget, unordered append behavior in
 * the Ralph iteration chunk handler.
 */

/** Outcome of draining the streamer: how many appends were attempted and how many were lost. */
export interface PlanOutputStreamSummary {
  /** Number of chunks enqueued for append. */
  readonly attempted: number;
  /** Number of chunks that failed every retry attempt and were dropped. */
  readonly failed: number;
  /** Message of the first chunk that failed all retries, for surfacing on the job. */
  readonly firstFailureMessage?: string;
}

/** Options for {@link createPlanOutputStreamer}. */
export interface CreatePlanOutputStreamerOptions {
  /** Appends a single chunk (e.g. `appendPlanOutput` bound to a plan/iteration). */
  readonly append: (content: string) => Promise<void>;
  /** Logger for ultimate failures and the drain summary. Defaults to `console`. */
  readonly logger?: Pick<Console, 'error' | 'warn'>;
  /** Total attempts per chunk including the first (1 disables retry). Defaults to 3. */
  readonly maxAttempts?: number;
  /** Delay between attempts in milliseconds. Defaults to 100. */
  readonly retryDelayMs?: number;
  /** Sleep implementation, injectable for tests. Defaults to a real timer. */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Serialized, retrying plan-output append queue. */
export interface PlanOutputStreamer {
  /** Awaits all queued appends and returns the attempt/failure summary. */
  drain(): Promise<PlanOutputStreamSummary>;
  /** Queues a chunk for in-order append. Never throws and never blocks the caller. */
  enqueue(content: string): void;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * @description Creates a streamer that appends chunks strictly in enqueue order: each
 * append is chained onto the previous one, so a slow or retrying append holds back the
 * chunks behind it rather than racing them. Appends that fail every retry are counted
 * (not thrown) so the caller can report the loss after draining.
 */
export function createPlanOutputStreamer(
  options: CreatePlanOutputStreamerOptions,
): PlanOutputStreamer {
  const {
    append,
    logger = console,
    maxAttempts = 3,
    retryDelayMs = 100,
    sleep = defaultSleep,
  } = options;

  let tail: Promise<void> = Promise.resolve();
  let attempted = 0;
  let failed = 0;
  let firstFailureMessage: string | undefined;

  const appendWithRetry = async (content: string): Promise<void> => {
    attempted += 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        // Sequential by design: each chunk must finish (or exhaust retries) before
        // the next runs, so output stays in order.
        // eslint-disable-next-line no-await-in-loop
        await append(content);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          // eslint-disable-next-line no-await-in-loop
          await sleep(retryDelayMs);
        }
      }
    }

    failed += 1;
    const message =
      lastError instanceof Error ? lastError.message : String(lastError);
    if (firstFailureMessage === undefined) {
      firstFailureMessage = message;
    }
    logger.error(
      `[plan-output] append_plan_output failed after ${maxAttempts} attempts: ${message}`,
    );
  };

  return {
    async drain(): Promise<PlanOutputStreamSummary> {
      await tail;

      if (failed > 0) {
        logger.warn(
          `[plan-output] ${failed}/${attempted} plan-output appends were lost (first error: ${firstFailureMessage}).`,
        );
      }

      return { attempted, failed, firstFailureMessage };
    },
    enqueue(content: string): void {
      tail = tail.then(() => appendWithRetry(content));
    },
  };
}
