/**
 * A read-only description of how telemetry config resolves for one checkout.
 *
 * This exists so a caller outside the hooks — the repository inspection scan —
 * can answer "would this checkout record anything?" using the SAME resolution
 * the hooks run, rather than a second implementation free to drift from it. The
 * bug this module was written for was exactly that: a description (a README)
 * that had drifted from the resolution.
 *
 * It deliberately says nothing about which agent tool is wired up. That is a
 * directory-existence question and a tool-specific one, and the core stays
 * neutral; the caller composes the two answers.
 *
 * Neither the endpoint URL nor the auth token appears in the result — only
 * whether one resolved, and which location supplied it.
 */
import { resolveTelemetryDir } from '../data/jsonl.ts';
import type { EnvResolutionOptions } from './env.ts';
import {
  graphqlUrlFromEnvMap,
  isOpenThrottleCheckout,
  readRepoEnvFile,
  readUserEnvFile,
  resolveAuthToken,
  resolveGraphqlUrl,
} from './env.ts';

/** Which location supplied the endpoint. @public */
export const TELEMETRY_CONFIG_SOURCES = Object.freeze({
  /** No layer yielded an endpoint. */
  NONE: 'none',
  /** The ambient shell. */
  PROCESS_ENV: 'process_env',
  /** This checkout's own `.env` — only read in an OpenThrottle checkout. */
  REPO_ENV: 'repo_env',
  /** `~/.openthrottle/.env`. */
  USER_ENV: 'user_env',
} as const);

/** @public */
export type TelemetryConfigSource =
  (typeof TELEMETRY_CONFIG_SOURCES)[keyof typeof TELEMETRY_CONFIG_SOURCES];

/** @public */
export interface TelemetryConfigDescription {
  /** True when an auth token resolved. The token value is never included. */
  readonly authTokenConfigured: boolean;
  /** True when an endpoint resolved. The URL is never included. */
  readonly endpointConfigured: boolean;
  /** Which layer answered, or `none`. */
  readonly endpointSource: TelemetryConfigSource;
  /** True when `OPENTHROTTLE_TELEMETRY_OFFLINE=1` forces local buffering. */
  readonly offline: boolean;
  /** True when this checkout's own `.env` participates at all. */
  readonly openThrottleCheckout: boolean;
  /** Absolute path telemetry buffers to when it cannot be sent. */
  readonly telemetryDir: string;
}

/**
 * Which layer answered. Mirrors `resolveGraphqlUrl`'s order exactly and asks
 * the same per-layer function, so it cannot name a layer the resolver would
 * not have used.
 */
const resolveEndpointSource = (
  repoRoot: string,
  endpoint: string | null,
  options: EnvResolutionOptions | undefined,
): TelemetryConfigSource => {
  if (!endpoint) {
    return TELEMETRY_CONFIG_SOURCES.NONE;
  }
  if (graphqlUrlFromEnvMap(readRepoEnvFile(repoRoot))) {
    return TELEMETRY_CONFIG_SOURCES.REPO_ENV;
  }
  if (
    options?.includeProcessEnv !== false &&
    graphqlUrlFromEnvMap(process.env)
  ) {
    return TELEMETRY_CONFIG_SOURCES.PROCESS_ENV;
  }
  if (graphqlUrlFromEnvMap(readUserEnvFile())) {
    return TELEMETRY_CONFIG_SOURCES.USER_ENV;
  }
  return TELEMETRY_CONFIG_SOURCES.NONE;
};

/**
 * Describe telemetry config for `repoRoot` without exposing any secret.
 *
 * Pass `{ includeProcessEnv: false }` when describing a checkout from a
 * different process than the agent would run in — the caller's own environment
 * is not the agent's, and counting it reports configuration the agent will
 * never see.
 *
 * @public
 */
export const describeTelemetryConfig = (
  repoRoot: string,
  options?: EnvResolutionOptions,
): TelemetryConfigDescription => {
  const endpoint = resolveGraphqlUrl(repoRoot, options);

  return {
    authTokenConfigured: Boolean(resolveAuthToken(repoRoot, options)),
    endpointConfigured: Boolean(endpoint),
    endpointSource: resolveEndpointSource(repoRoot, endpoint, options),
    offline: process.env.OPENTHROTTLE_TELEMETRY_OFFLINE === '1',
    openThrottleCheckout: isOpenThrottleCheckout(repoRoot),
    telemetryDir: resolveTelemetryDir(),
  };
};
