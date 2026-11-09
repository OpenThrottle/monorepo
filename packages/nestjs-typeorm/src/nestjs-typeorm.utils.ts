import type { ConfigService } from '@nestjs/config';

import type { Schema } from './nestjs-typeorm.types.ts';
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
