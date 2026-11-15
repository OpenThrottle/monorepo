/**
 * Resolved model-discovery configuration. Hosts/ports are resolved up front by
 * the core helpers (the only place `process.env` is read); the pure core stays
 * env-free.
 */
export interface ModelDiscoveryConfig {
  /**
   * In-process soft cache TTL in ms. Within this window a snapshot is served
   * fresh; past it (but within {@link hardTtlMs}) it is served stale while a
   * background refresh runs. `0` disables caching (always re-scan).
   */
  readonly cacheTtlMs: number;
  /** Provider-fingerprint probe timeout, ms. */
  readonly fingerprintTimeoutMs: number;
  /**
   * Hard-staleness bound in ms. Past this the snapshot is too stale to serve and
   * the next read blocks on a fresh scan. Always `>= cacheTtlMs` (clamped).
   */
  readonly hardTtlMs: number;
  /** Hosts to probe. */
  readonly hosts: readonly string[];
  /** Max in-flight probes. */
  readonly maxConcurrency: number;
  /** Ports to probe on each host. */
  readonly ports: readonly number[];
  /** `/v1/models` probe timeout, ms. */
  readonly probeTimeoutMs: number;
  /**
   * Whether to run one scan in the background right after the app boots, so
   * the first chat load finds a warm cache. Never blocks bootstrap.
   */
  readonly warmOnBoot: boolean;
}
