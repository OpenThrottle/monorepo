/*
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

const defaultSleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

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
        // eslint-disable-next-line no-await-in-loop -- sequential by design: each retry must observe the previous attempt
        await append(content);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          // eslint-disable-next-line no-await-in-loop -- sequential by design: backoff between retry attempts
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

/*
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
const buildSummaryLine = (lineCount: number): string => {
  return `[workflow-ralph] suppressed ${lineCount} /bin/sh command-misparse line(s) (cursor-agent Shell tool passed multiline prose to the shell; see plan 65a8dd25 finding #1)`;
};

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
