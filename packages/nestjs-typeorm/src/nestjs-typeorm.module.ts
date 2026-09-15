import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { DatabaseModule } from './modules/database/database.module';
import { schema } from './nestjs-typeorm.config';

/**
 * Composition root for the package. Sets up the Joi-validated `ConfigModule`
 * (the only path that produces the typed Postgres config) and the shared
 * `LoggerModule`, then delegates the actual `DATA_SOURCE` wiring to
 * `DatabaseModule`. The `databaseProviders` are registered in exactly one place
 * (`DatabaseModule`) and re-exported here so importing this module gives a
 * consumer the same single, shared `DATA_SOURCE` — no double-initialization.
 */
@Module({
  exports: [DatabaseModule],
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      // Joi-specific options live under `libraryOptions` since @nestjs/config
      // v12, which validates through Standard Schema rather than calling Joi
      // directly. Kept explicit rather than dropped: v12 defaults Joi schemas to
      // `abortEarly: false`, so deleting these would silently flip this module
      // from reporting the first bad POSTGRES_* var to reporting all of them.
      validationOptions: {
        libraryOptions: {
          abortEarly: true,
          allowUnknown: true,
          cache: true,
        },
      },
      validationSchema: schema,
    }),
    DatabaseModule,
    LoggerModule,
  ],
})
export class NestjsTypeormModule {}
