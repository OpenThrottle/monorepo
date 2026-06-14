import type {
  DiscoverModelsOptions,
  DiscoveryResult,
  ModelEndpoint,
} from '../../types/model-discovery.js';
import { HOST_PREFERENCE } from './constants.js';
import { probeAll } from './probe.js';

/**
 * Rank a host against {@link HOST_PREFERENCE}: lower is preferred. Hosts not in
 * the preference list (e.g. `LLM_HOSTS` entries) rank last.
 */
function hostRank(host: string): number {
  const index = HOST_PREFERENCE.indexOf(host);
  return index === -1 ? HOST_PREFERENCE.length : index;
}

/** Stable, deterministic composite key: same machine via multiple IPs collapses. */
function endpointKey(endpoint: ModelEndpoint): string {
  return `${endpoint.port}|${[...endpoint.models].sort().join(`,`)}`;
}

/**
 * De-duplicate endpoints by `(port, sorted model ids)`, keeping the
 * most-preferred host for each (localhost > 127.0.0.1 > host.docker.internal >
 * others, ties broken by host string). The result is stably sorted by
 * `(host, port)`.
 *
 * @publicApi
 */
export function dedupeEndpoints(
  endpoints: readonly ModelEndpoint[],
): ModelEndpoint[] {
  const byKey = new Map<string, ModelEndpoint>();
  for (const endpoint of endpoints) {
    const key = endpointKey(endpoint);
    const existing = byKey.get(key);
    if (existing === undefined) {
      byKey.set(key, endpoint);
      continue;
    }
    const rank = hostRank(endpoint.host);
    const existingRank = hostRank(existing.host);
    if (
      rank < existingRank ||
      (rank === existingRank && endpoint.host < existing.host)
    ) {
      byKey.set(key, endpoint);
    }
  }
  return [...byKey.values()].sort((left, right) =>
    left.host === right.host
      ? left.port - right.port
      : left.host < right.host
        ? -1
        : 1,
  );
}

/**
 * Probe the given hosts × ports for running OpenAI-compatible model servers,
 * de-duplicate and sort the reachable endpoints, and return a typed
 * {@link DiscoveryResult}.
 *
 * Pure with respect to configuration: hosts/ports are passed in explicitly (see
 * {@link resolveHosts} / {@link resolvePorts}). `scannedAt` is taken from
 * options when provided (the caller stamps it — e.g. the cached Nest wrapper);
 * otherwise it defaults to the current time.
 *
 * @publicApi
 */
export async function discoverModels(
  options: DiscoverModelsOptions,
): Promise<DiscoveryResult> {
  const endpoints = dedupeEndpoints(
    await probeAll(options.hosts, options.ports, {
      fingerprintTimeoutMs: options.fingerprintTimeoutMs,
      maxConcurrency: options.maxConcurrency,
      probeTimeoutMs: options.probeTimeoutMs,
    }),
  );
  return {
    endpoints,
    scannedAt: options.scannedAt ?? new Date().toISOString(),
    scannedHosts: [...options.hosts],
  };
}
