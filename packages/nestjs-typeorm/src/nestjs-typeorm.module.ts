import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Module } from '@nestjs/common';
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
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
        cache: true,
      },
      validationSchema: schema,
    }),
    DatabaseModule,
    LoggerModule,
  ],
})
export class NestjsTypeormModule {}
