/**
 * Best-effort stderr logging for hooks. Never throws.
 */

/**
 * Write a one-line diagnostic to stderr. Swallows all errors so logging can
 * never break a fail-open hook.
 *
 * @public
 */
export const logHookError = (message: string, err?: unknown): void => {
  try {
    const detail =
      err instanceof Error ? err.message : err != null ? String(err) : '';
    process.stderr.write(
      `[skill-usage-capture] ${message}${detail ? `: ${detail}` : ''}\n`,
    );
  } catch {
    // swallow
  }
};
