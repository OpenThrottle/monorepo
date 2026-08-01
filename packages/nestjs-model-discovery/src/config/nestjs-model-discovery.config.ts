import { registerAs } from '@nestjs/config';
import {
  DEFAULT_FINGERPRINT_TIMEOUT_MS,
  DEFAULT_MAX_CONCURRENCY,
  DEFAULT_PROBE_TIMEOUT_MS,
  resolveHosts,
  resolvePorts,
} from '@openthrottle/openthrottle-agentic-utils';
import * as Joi from 'joi';

/** ConfigService namespace for the model-discovery wrapper. */
export const MODEL_DISCOVERY_CONFIG_NAMESPACE = 'modelDiscovery';

/** Default in-process soft cache TTL: back-to-back reads reuse one scan for 60s. */
export const DEFAULT_CACHE_TTL_MS = 60_000;

/**
 * Default hard-staleness multiplier over the soft TTL. Between the soft and hard
 * TTL the last-good snapshot is served while a background refresh runs
 * (stale-while-revalidate); past the hard TTL the next read blocks on a fresh
 * scan so an idle process never serves arbitrarily stale data.
 */
export const DEFAULT_HARD_TTL_MULTIPLIER = 10;

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
}

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
 * Joi schema for the env knobs this package reads (all optional). Applied by
 * {@link buildModelDiscoveryConfig} on every config build, so malformed values
 * (e.g. `LLM_PROBE_TIMEOUT_MS=abc`) are rejected up front rather than silently
 * coerced to defaults. Unknown keys are ignored so the schema can validate the
 * full `process.env`. Also exported so a consumer can compose it into a
 * top-level `ConfigModule.forRoot({ validationSchema })`.
 *
 * @public
 */
export const configValidationSchema = Joi.object({
  LLM_DISCOVERY_CACHE_TTL_MS: Joi.number().integer().min(0).optional(),
  LLM_DISCOVERY_CONCURRENCY: Joi.number().integer().min(1).optional(),
  LLM_DISCOVERY_HARD_TTL_MS: Joi.number().integer().min(0).optional(),
  LLM_FINGERPRINT_TIMEOUT_MS: Joi.number().integer().min(1).optional(),
  LLM_HOSTS: Joi.string().optional(),
  LLM_PORTS: Joi.string().optional(),
  LLM_PROBE_TIMEOUT_MS: Joi.number().integer().min(1).optional(),
  LM_STUDIO_URL: Joi.string().uri().optional(),
  OLLAMA_BASE_URL: Joi.string().uri().optional(),
  OLLAMA_URL: Joi.string().uri().optional(),
}).unknown(true);

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
  };
}

/** Config namespace consumed via `ConfigService.get('modelDiscovery')`. */
export const modelDiscoveryConfig = registerAs(
  MODEL_DISCOVERY_CONFIG_NAMESPACE,
  (): ModelDiscoveryConfig => buildModelDiscoveryConfig(process.env),
);
