/**
 * Point a backend's `*_BIN` env override at a bin for the duration of `run`,
 * restoring the previous value afterwards. The backends read the override from
 * `process.env` at spawn time, so this is process-global: never overlap two
 * calls (Vitest runs the tests within one file sequentially by default).
 *
 * @public
 */
export async function withBinEnv<TResult>(
  binEnv: string,
  bin: string,
  run: () => Promise<TResult>,
): Promise<TResult> {
  const previous = process.env[binEnv];
  process.env[binEnv] = bin;

  try {
    return await run();
  } finally {
    if (previous === undefined) {
      delete process.env[binEnv];
    } else {
      process.env[binEnv] = previous;
    }
  }
}
