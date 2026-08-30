import { registerAs } from '@nestjs/config';
import {
  DEFAULT_REMOTE_CATALOG_TIMEOUT_MS,
  OPENROUTER_DEFAULT_BASE_URL,
  OPENROUTER_REFERER_HEADER,
  OPENROUTER_TITLE_HEADER,
} from '@openthrottle/openthrottle-agentic-utils';
import * as Joi from 'joi';

/** ConfigService namespace for the remote model-catalog wrapper. */
export const REMOTE_MODELS_CONFIG_NAMESPACE = 'remoteModels';

/**
 * Default soft cache TTL: one hour. Far longer than local discovery's 60s
 * because this is a published catalog that changes on the order of days, not a
 * port scan of a machine whose servers come and go.
 */
export const DEFAULT_REMOTE_CACHE_TTL_MS = 3_600_000;

/**
 * Default hard-staleness bound: one day. Between the soft and hard TTL the
 * last-good catalog is served while a background refresh runs; past it the next
 * read blocks on a fresh fetch.
 */
export const DEFAULT_REMOTE_HARD_TTL_MS = 86_400_000;

/**
 * Resolved remote-catalog configuration.
 *
 * This is the SINGLE place `OPENROUTER_*` env vars are read. Nothing else in
 * the tree may reach for `process.env.OPENROUTER_*`.
 */
export interface RemoteModelsConfig {
  /**
   * OpenRouter gateway key. Empty string when unset — the catalog then still
   * loads (OpenRouter serves it unauthenticated) but the provider reports
   * itself unconfigured, so it is not offered as a chat backend.
   *
   * NEVER expose this over GraphQL, in a loader payload, or in a log line.
   */
  readonly apiKey: string;
  /** OpenRouter API root, e.g. `https://openrouter.ai/api/v1`. */
  readonly baseUrl: string;
  /** Soft cache TTL in ms; `0` disables caching. */
  readonly cacheTtlMs: number;
  /** `true` when an API key is set — the only fact a client learns about it. */
  readonly configured: boolean;
  /** Hard-staleness bound in ms. Always `>= cacheTtlMs` (clamped). */
  readonly hardTtlMs: number;
  /** Attribution headers sent on every OpenRouter request. Never contains the key. */
  readonly headers: Readonly<Record<string, string>>;
  /** Per-request timeout in ms. */
  readonly timeoutMs: number;
}

/** Parse a non-negative integer env value, falling back when malformed. */
function intFromEnv(value: string | undefined, fallback: number): number {
  const parsed = value === undefined ? Number.NaN : Number.parseInt(value, 10);

  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Trim an env value to a string, treating unset/blank alike. */
function stringFromEnv(value: string | undefined, fallback = ''): string {
  const trimmed = value?.trim() ?? '';

  return trimmed === '' ? fallback : trimmed;
}

/**
 * Joi schema for the env knobs this package reads (all optional). Unknown keys
 * are ignored so it can validate the full `process.env`. Exported so a consumer
 * can compose it into a top-level `ConfigModule.forRoot({ validationSchema })`.
 *
 * Note `OPENROUTER_API_KEY` is validated only as a string — never as a pattern.
 * A pattern mismatch would put the key's shape into an error message.
 *
 * @public
 */
export const remoteModelsValidationSchema = Joi.object({
  OPENROUTER_API_KEY: Joi.string().allow('').optional(),
  OPENROUTER_APP_TITLE: Joi.string().allow('').optional(),
  OPENROUTER_BASE_URL: Joi.string().uri().optional(),
  OPENROUTER_CATALOG_CACHE_TTL_MS: Joi.number().integer().min(0).optional(),
  OPENROUTER_CATALOG_HARD_TTL_MS: Joi.number().integer().min(0).optional(),
  OPENROUTER_CATALOG_TIMEOUT_MS: Joi.number().integer().min(1).optional(),
  OPENROUTER_SITE_URL: Joi.string().uri().allow('').optional(),
}).unknown(true);

/**
 * Build a {@link RemoteModelsConfig} from an env-like object. Validates the env
 * first, throwing on malformed values instead of silently coercing them.
 *
 * @public
 */
export function buildRemoteModelsConfig(
  env: NodeJS.ProcessEnv,
): RemoteModelsConfig {
  const { error } = remoteModelsValidationSchema.validate(env, {
    abortEarly: false,
  });

  if (error !== undefined) {
    throw new Error(
      `Invalid remote-models env configuration: ${error.message}`,
    );
  }

  const apiKey = stringFromEnv(env.OPENROUTER_API_KEY);
  const cacheTtlMs = intFromEnv(
    env.OPENROUTER_CATALOG_CACHE_TTL_MS,
    DEFAULT_REMOTE_CACHE_TTL_MS,
  );

  // Attribution headers are omitted rather than sent empty, so an operator who
  // configures neither sends no attribution at all.
  const siteUrl = stringFromEnv(env.OPENROUTER_SITE_URL);
  const appTitle = stringFromEnv(env.OPENROUTER_APP_TITLE);
  const headers: Record<string, string> = {};
  if (siteUrl !== '') {
    headers[OPENROUTER_REFERER_HEADER] = siteUrl;
  }
  if (appTitle !== '') {
    headers[OPENROUTER_TITLE_HEADER] = appTitle;
  }

  return {
    apiKey,
    baseUrl: stringFromEnv(
      env.OPENROUTER_BASE_URL,
      OPENROUTER_DEFAULT_BASE_URL,
    ),
    cacheTtlMs,
    configured: apiKey !== '',
    hardTtlMs: Math.max(
      cacheTtlMs,
      intFromEnv(
        env.OPENROUTER_CATALOG_HARD_TTL_MS,
        Math.max(cacheTtlMs, DEFAULT_REMOTE_HARD_TTL_MS),
      ),
    ),
    headers,
    timeoutMs: intFromEnv(
      env.OPENROUTER_CATALOG_TIMEOUT_MS,
      DEFAULT_REMOTE_CATALOG_TIMEOUT_MS,
    ),
  };
}

/** Config namespace consumed via `ConfigService.get('remoteModels')`. */
export const remoteModelsConfig = registerAs(
  REMOTE_MODELS_CONFIG_NAMESPACE,
  (): RemoteModelsConfig => buildRemoteModelsConfig(process.env),
);
