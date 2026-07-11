import type { DiscoveryEnv } from '../../types/model-discovery.ts';
import {
  DEFAULT_HOST,
  DEFAULT_PORTS,
  DOCKER_INTERNAL_HOST,
  LLM_HOSTS_ENV,
  LLM_PORTS_ENV,
  PROVIDER_URL_ENVS,
} from './constants.ts';

/**
 * A pluggable source of candidate hosts, derived from an env-like object.
 *
 * This is the seam left for a future Tailscale (or other multi-host) source:
 * register an extra source via {@link ResolveHostsOptions.extraSources} without
 * touching the core. No Tailscale code ships today.
 *
 * @public
 */
export type HostSource = (env: DiscoveryEnv) => readonly string[];

/**
 * Options for {@link resolveHosts}.
 *
 * @public
 */
export interface ResolveHostsOptions {
  /**
   * Extra host sources merged in after the built-in ones. Order is preserved
   * and the merged list is de-duplicated. Use this to plug in a Tailscale peer
   * source later.
   */
  readonly extraSources?: readonly HostSource[];
}

/** Split a comma/whitespace-separated env value into trimmed, non-empty parts. */
function splitList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Parse a provider URL env value into its hostname (and port, when present).
 * Tolerates bare `host:port` values that are not valid absolute URLs.
 */
function parseProviderUrl(value: string): { host?: string; port?: number } {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }
  try {
    const url = new URL(trimmed);
    const port = url.port ? Number.parseInt(url.port, 10) : undefined;
    return {
      host: url.hostname || undefined,
      port: port !== undefined && Number.isInteger(port) ? port : undefined,
    };
  } catch {
    // Fall back to `host[:port]` parsing for non-URL values.
    const match = /^([^:/\s]+)(?::(\d+))?$/.exec(trimmed);
    if (!match) {
      return {};
    }
    const port = match[2] ? Number.parseInt(match[2], 10) : undefined;
    return {
      host: match[1],
      port: port !== undefined && Number.isInteger(port) ? port : undefined,
    };
  }
}

/** Hosts parsed from the provider URL env vars, in declaration order. */
function providerUrlHosts(env: DiscoveryEnv): string[] {
  const hosts: string[] = [];
  for (const key of PROVIDER_URL_ENVS) {
    const value = env[key];
    if (!value) {
      continue;
    }
    const { host } = parseProviderUrl(value);
    if (host) {
      hosts.push(host);
    }
  }
  return hosts;
}

/** Ports parsed from the provider URL env vars, in declaration order. */
function providerUrlPorts(env: DiscoveryEnv): number[] {
  const ports: number[] = [];
  for (const key of PROVIDER_URL_ENVS) {
    const value = env[key];
    if (!value) {
      continue;
    }
    const { port } = parseProviderUrl(value);
    if (port !== undefined) {
      ports.push(port);
    }
  }
  return ports;
}

/** De-duplicate while preserving first-seen order. */
function uniqueInOrder<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

/**
 * Resolve the set of hosts to probe from an env-like object.
 *
 * Two-tier: an explicit `LLM_HOSTS` override replaces the default base set;
 * otherwise the base set is `localhost` + `host.docker.internal`. Either way,
 * hosts parsed from `OLLAMA_BASE_URL` / `OLLAMA_URL` / `LM_STUDIO_URL` and any
 * {@link ResolveHostsOptions.extraSources} are merged in. The result is
 * de-duplicated in first-seen order. The core never reads `process.env`.
 *
 * @public
 */
export function resolveHosts(
  env: DiscoveryEnv,
  options: ResolveHostsOptions = {},
): string[] {
  const override = splitList(env[LLM_HOSTS_ENV]);
  const base =
    override.length > 0 ? override : [DEFAULT_HOST, DOCKER_INTERNAL_HOST];

  const extras = (options.extraSources ?? []).flatMap((source) => [
    ...source(env),
  ]);

  return uniqueInOrder([...base, ...providerUrlHosts(env), ...extras]);
}

/**
 * Resolve the set of ports to probe from an env-like object.
 *
 * An explicit `LLM_PORTS` override replaces the default port set; otherwise the
 * default set is used. Ports parsed from the provider URL env vars are always
 * merged in. The result is de-duplicated and sorted ascending.
 *
 * @public
 */
export function resolvePorts(env: DiscoveryEnv): number[] {
  const override = splitList(env[LLM_PORTS_ENV])
    .map((part) => Number.parseInt(part, 10))
    .filter((port) => Number.isInteger(port) && port > 0 && port <= 65535);
  const base = override.length > 0 ? override : [...DEFAULT_PORTS];

  return uniqueInOrder([...base, ...providerUrlPorts(env)]).sort(
    (left, right) => left - right,
  );
}
