import type { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

export interface Schema {
  POSTGRES_CONNECT_TIMEOUT_MS: number;
  POSTGRES_DB: string;
  POSTGRES_HOST: string;
  POSTGRES_IDLE_TIMEOUT_MS: number;
  POSTGRES_PASSWORD: string;
  POSTGRES_PATH_MIGRATIONS: string;
  POSTGRES_POOL_MAX: number;
  POSTGRES_PORT: number;
  POSTGRES_SSL: boolean;
  POSTGRES_SSL_REJECT_UNAUTHORIZED: boolean;
  POSTGRES_STATEMENT_TIMEOUT_MS: number;
  POSTGRES_USER: string;
  POSTGRES_VERSION: string;
}

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

/**
 * Reads the TypeORM/Postgres config from the validated Nest `ConfigService`.
 *
 * `ConfigModule.forRoot({ validationSchema: schema })` runs the Joi schema
 * above against `process.env` at bootstrap: required keys must be present and
 * the optional knobs are coerced + defaulted. By the time this runs the values
 * are validated and typed, so we read them through `ConfigService` rather than
 * touching `process.env` directly (no non-null assertions, no silent
 * `undefined`/`NaN` from a missing var — validation fails loud first).
 *
 * `getOrThrow` is used for the required keys so a config that somehow slipped
 * past validation still fails loudly instead of producing an undefined value.
 */
export const getTypeormConfig = (configService: ConfigService): Schema => {
  const config: Schema = {
    POSTGRES_CONNECT_TIMEOUT_MS: configService.getOrThrow<number>('POSTGRES_CONNECT_TIMEOUT_MS'), // prettier-ignore
    POSTGRES_DB: configService.getOrThrow<string>('POSTGRES_DB'),
    POSTGRES_HOST: configService.getOrThrow<string>('POSTGRES_HOST'),
    POSTGRES_IDLE_TIMEOUT_MS: configService.getOrThrow<number>('POSTGRES_IDLE_TIMEOUT_MS'), // prettier-ignore
    POSTGRES_PASSWORD: configService.getOrThrow<string>('POSTGRES_PASSWORD'),
    POSTGRES_PATH_MIGRATIONS: configService.getOrThrow<string>('POSTGRES_PATH_MIGRATIONS'), // prettier-ignore
    POSTGRES_POOL_MAX: configService.getOrThrow<number>('POSTGRES_POOL_MAX'),
    POSTGRES_PORT: configService.getOrThrow<number>('POSTGRES_PORT'),
    POSTGRES_SSL: configService.getOrThrow<boolean>('POSTGRES_SSL'),
    POSTGRES_SSL_REJECT_UNAUTHORIZED: configService.getOrThrow<boolean>('POSTGRES_SSL_REJECT_UNAUTHORIZED'), // prettier-ignore
    POSTGRES_STATEMENT_TIMEOUT_MS: configService.getOrThrow<number>('POSTGRES_STATEMENT_TIMEOUT_MS'), // prettier-ignore
    POSTGRES_USER: configService.getOrThrow<string>('POSTGRES_USER'),
    POSTGRES_VERSION: configService.getOrThrow<string>('POSTGRES_VERSION'),
  };

  return config;
};
