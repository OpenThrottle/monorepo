import { SHELL_HEALTH_PATH } from '../data/data.server-env.ts';

export type ProbeResult =
  { readonly ok: false; readonly reason: string } | { readonly ok: true };

export interface ProbeOptions {
  readonly fetch: (
    url: string,
    init: { readonly signal: AbortSignal },
  ) => Promise<{ readonly status: number }>;
  readonly intervalMs: number;
  readonly now: () => number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly timeoutMs: number;
}

/**
 * @description Polls the child's `/__shell/health` route until it answers 200
 * or the timeout elapses. The route only answers 200 once the developer build
 * is imported and mounted, so a 200 means the origin serves the app. Never
 * throws: a refused connection is just another failed attempt.
 */
export const probeOrigin = async (
  origin: string,
  options: ProbeOptions,
): Promise<ProbeResult> => {
  const { fetch, intervalMs, now, sleep, timeoutMs } = options;
  const deadline = now() + timeoutMs;

  const attempt = async (): Promise<ProbeResult> => {
    const remaining = Math.max(1, deadline - now());
    const status = await fetch(`${origin}${SHELL_HEALTH_PATH}`, {
      signal: AbortSignal.timeout(remaining),
    }).then(
      (response) => response.status,
      () => undefined,
    );

    if (status === 200) {
      return { ok: true };
    }

    if (now() >= deadline) {
      return {
        ok: false,
        reason: `health probe of ${origin} timed out after ${timeoutMs}ms (last status: ${status ?? 'no response'})`,
      };
    }

    await sleep(intervalMs);

    return attempt();
  };

  return attempt();
};
