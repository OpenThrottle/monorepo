import Joi from 'joi';

import type { Schema } from './nestjs-typeorm.types.ts';
/**
 * Defaults for the optional connection-hardening knobs. Kept here so the Joi
 * schema and the runtime getter cannot drift.
 *
 * - Timeouts are conservative ceilings (10s connect, 30s statement) so a wedged
 *   network or runaway query can't pin a connection forever.
 * - `POSTGRES_POOL_MAX` bounds connections per process; managed Postgres has a
 *   hard `max_connections` and unbounded pools exhaust it.
 * - SSL defaults OFF (local docker Postgres has no TLS); enable in prod via env.
 */
const DEFAULTS = {
  POSTGRES_CONNECT_TIMEOUT_MS: 10_000,
  POSTGRES_IDLE_TIMEOUT_MS: 30_000,
  POSTGRES_POOL_MAX: 10,
  POSTGRES_SSL: false,
  POSTGRES_SSL_REJECT_UNAUTHORIZED: true,
  POSTGRES_STATEMENT_TIMEOUT_MS: 30_000,
} as const;

export const schema = Joi.object<Schema>({
  POSTGRES_CONNECT_TIMEOUT_MS: Joi.number()
    .integer()
    .min(0)
    .default(DEFAULTS.POSTGRES_CONNECT_TIMEOUT_MS),
  POSTGRES_DB: Joi.string().required(),
  POSTGRES_HOST: Joi.string().required(),
  POSTGRES_IDLE_TIMEOUT_MS: Joi.number()
    .integer()
    .min(0)
    .default(DEFAULTS.POSTGRES_IDLE_TIMEOUT_MS),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_PATH_MIGRATIONS: Joi.string().required(),
  POSTGRES_POOL_MAX: Joi.number()
    .integer()
    .min(1)
    .default(DEFAULTS.POSTGRES_POOL_MAX),
  POSTGRES_PORT: Joi.number().port().required(),
  POSTGRES_SSL: Joi.boolean().default(DEFAULTS.POSTGRES_SSL),
  POSTGRES_SSL_REJECT_UNAUTHORIZED: Joi.boolean().default(
    DEFAULTS.POSTGRES_SSL_REJECT_UNAUTHORIZED,
  ),
  POSTGRES_STATEMENT_TIMEOUT_MS: Joi.number()
    .integer()
    .min(0)
    .default(DEFAULTS.POSTGRES_STATEMENT_TIMEOUT_MS),
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_VERSION: Joi.string().required(),
});
