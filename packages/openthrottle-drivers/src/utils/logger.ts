/**
 * @description Injectable logger contract for the driver execution engine, replacing tools/workflows'
 * `ralphDebugLogger` so this package carries no dependency on Ralph. The engine defaults to
 * {@link noopDriverLogger}; tools/workflows wires `ralphDebugLogger.debug` / `.verbose` in.
 */

/**
 * @description Two-level structured logger. Both methods accept arbitrary args (message + context
 * object), matching the legacy `ralphDebugLogger` call sites.
 * @public
 */
export interface DriverLogger {
  /** High-signal messages (phases, exit codes, parse outcomes). */
  debug: (...args: readonly unknown[]) => void;
  /** Extra detail (per-chunk lines in tight loops). */
  verbose: (...args: readonly unknown[]) => void;
}

const noop = (): void => {};

/**
 * @description No-op logger used when the caller injects nothing. Safe in hot paths.
 * @public
 */
export const noopDriverLogger: DriverLogger = {
  debug: noop,
  verbose: noop,
};
