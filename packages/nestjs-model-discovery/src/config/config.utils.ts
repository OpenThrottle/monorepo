import {
  DEFAULT_FINGERPRINT_TIMEOUT_MS,
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_PROBE_TIMEOUT_MS,
  resolveHosts,
  resolvePorts,
} from '@openthrottle/openthrottle-agentic-utils';

import {
  configValidationSchema,
  DEFAULT_CACHE_TTL_MS,
  DEFAULT_HARD_TTL_MULTIPLIER,
  FALSY_WARM_ON_BOOT_VALUES,
} from './config.constants.ts';
import type { ModelDiscoveryConfig } from './config.types.ts';

/** Parse a positive (or, when `allowZero`, non-negative) integer env value. */
function intFromEnv(
  value: string | undefined,
  fallback: number,
  allowZero = false,
): number {
  const parsed = value === undefined ? Number.NaN : Number.parseInt(value, 10);
  const min = allowZero ? 0 : 1;

  return Number.isInteger(parsed) && parsed >= min ? parsed : fallback;
}

/**
 * Whether to warm the discovery cache on boot. An explicit value wins; unset
 * (or blank) means on, except under a test runner.
 */
function warmOnBootFromEnv(env: NodeJS.ProcessEnv): boolean {
  const raw = env.LLM_DISCOVERY_WARM_ON_BOOT?.trim().toLowerCase();

  if (raw !== undefined && raw !== '') {
    return !FALSY_WARM_ON_BOOT_VALUES.includes(raw);
  }

  const underTestRunner = env.NODE_ENV === 'test' || (env.VITEST ?? '') !== '';

  return !underTestRunner;
}

/**
 * Build a {@link ModelDiscoveryConfig} from an env-like object. Validates the
 * env against {@link configValidationSchema} first, throwing on malformed
 * values instead of silently coercing them to defaults.
 */
export function buildModelDiscoveryConfig(
  env: NodeJS.ProcessEnv,
): ModelDiscoveryConfig {
  const { error } = configValidationSchema.validate(env, {
    abortEarly: false,
  });

  if (error !== undefined) {
    throw new Error(
      `Invalid model-discovery env configuration: ${error.message}`,
    );
  }

  const cacheTtlMs = intFromEnv(
    env.LLM_DISCOVERY_CACHE_TTL_MS,
    DEFAULT_CACHE_TTL_MS,
    true,
  );

  return {
    cacheTtlMs,
    fingerprintTimeoutMs: intFromEnv(
      env.LLM_FINGERPRINT_TIMEOUT_MS,
      DEFAULT_FINGERPRINT_TIMEOUT_MS,
    ),
    // Hard bound defaults to 10x the soft TTL; clamped up so it can never be
    // smaller than the soft TTL (which would defeat stale-while-revalidate).
    hardTtlMs: Math.max(
      cacheTtlMs,
      intFromEnv(
        env.LLM_DISCOVERY_HARD_TTL_MS,
        cacheTtlMs * DEFAULT_HARD_TTL_MULTIPLIER,
        true,
      ),
    ),
    hosts: resolveHosts(env),
    maxConcurrency: intFromEnv(
      env.LLM_DISCOVERY_CONCURRENCY,
      DEFAULT_MAX_CONCURRENCY,
    ),
    ports: resolvePorts(env),
    probeTimeoutMs: intFromEnv(
      env.LLM_PROBE_TIMEOUT_MS,
      DEFAULT_PROBE_TIMEOUT_MS,
    ),
    warmOnBoot: warmOnBootFromEnv(env),
  };
}
