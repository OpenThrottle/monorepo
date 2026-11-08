import Joi from 'joi';

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
