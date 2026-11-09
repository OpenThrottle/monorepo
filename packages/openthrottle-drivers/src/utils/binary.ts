/**
 * @description The one rule for which executable a driver runs: the driver's `binEnv` override when
 * it is set to a non-blank value, otherwise the bare `binary` name resolved off PATH. Discovery,
 * chat, version probes and the run engine all resolve through this, so a stub binary named by
 * `OPENTHROTTLE_<X>_BIN` is the binary every surface sees, not just the ones that probe it.
 */

import type { AgentDriver } from '../types/index.ts';

/**
 * @description The executable to spawn for `driver` under `env`: `env[driver.binEnv]` (trimmed)
 * when non-blank, else `driver.binary`.
 * @public
 */
export const resolveDriverBinary = (
  driver: Pick<AgentDriver, 'binEnv' | 'binary'>,
  env: Readonly<Record<string, string | undefined>>,
): string => {
  const override =
    driver.binEnv === undefined ? undefined : env[driver.binEnv]?.trim();

  return override !== undefined && override !== '' ? override : driver.binary;
};
