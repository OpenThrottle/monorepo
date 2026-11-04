import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { getTypeormConfig } from '../../nestjs-typeorm.config.ts';
import { DATA_SOURCE } from './database.constants.ts';

/**
 * @external https://docs.nestjs.com/recipes/sql-typeorm#getting-started
 * @description Following best practices, we declared the custom provider in
 * the separated file which has a `*.providers.ts` suffix.
 *
 * Now we can inject the "DATA_SOURCE" object using "@Inject()" decorator.
 * Each class that would depend on the "DATA_SOURCE" async provider will
 * wait until a Promise is resolved.
 */
export const databaseProviders = [
  {
    inject: [ConfigService],
    provide: DATA_SOURCE,
    useFactory: async (configService: ConfigService) => {
      const config = getTypeormConfig(configService);

      /**
       * Schema auto-sync is destructive: TypeORM will ALTER the live schema to
       * match the entities. It must default to OFF and require an explicit
       * opt-in, and can never be enabled in production even by accident.
       *
       * - `POSTGRES_SYNCHRONIZE === 'true'` is an explicit opt-in (default off).
       * - `NODE_ENV !== 'production'` is a hard guard so prod can never sync.
       */
      const synchronize =
        process.env.POSTGRES_SYNCHRONIZE === 'true' &&
        process.env.NODE_ENV !== 'production';

      /**
       * Transport security. Managed Postgres (RDS / Cloud SQL) terminates TLS,
       * so prod must opt in via `POSTGRES_SSL=true`. `rejectUnauthorized`
       * defaults ON (verify the server cert); set
       * `POSTGRES_SSL_REJECT_UNAUTHORIZED=false` only for providers that present
       * a self-signed/non-chained cert. Off entirely for local docker Postgres.
       */
      const ssl = config.POSTGRES_SSL
        ? { rejectUnauthorized: config.POSTGRES_SSL_REJECT_UNAUTHORIZED }
        : false;

      const dataSource = new DataSource({
        connectTimeoutMS: config.POSTGRES_CONNECT_TIMEOUT_MS,
        database: config.POSTGRES_DB,
        /**
         * Empty on purpose, and not a mechanical `__dirname` ->
         * `import.meta.dirname` swap of the glob that used to be here.
         *
         * That glob was `__dirname + '/../**' + '/*.entity.js'`, resolved
         * against this package's own emitted `dist/`. This package ships **no
         * entities** — all 45 live in `@openthrottle/nestjs-repositories` and
         * `@openthrottle/nestjs-rollout` — so it matched nothing, before or
         * after this change. Keeping it under ESM would have preserved dead
         * config while implying it loaded something.
         *
         * Real entity registration is explicit and static, in
         * `packages/nestjs-repositories/src/database.config.ts`
         * (`getTypeOrmOptions`), which is the shape this repo wants anyway:
         * typed, and visible to the build graph in a way a runtime glob is not.
         */
        entities: [],
        /**
         * `extra` is passed through to the `pg` Pool. Bounding `max` keeps a
         * single process from exhausting the server's `max_connections`;
         * `idleTimeoutMillis` reaps idle clients; the statement timeout caps
         * runaway queries server-side so a connection can't be pinned forever.
         */
        extra: {
          idleTimeoutMillis: config.POSTGRES_IDLE_TIMEOUT_MS,
          max: config.POSTGRES_POOL_MAX,
          statement_timeout: config.POSTGRES_STATEMENT_TIMEOUT_MS,
        },
        host: config.POSTGRES_HOST,
        migrations: [config.POSTGRES_PATH_MIGRATIONS],
        password: config.POSTGRES_PASSWORD,
        port: Number(config.POSTGRES_PORT),
        ssl,
        synchronize,
        type: 'postgres',
        username: config.POSTGRES_USER,
      });

      return dataSource.initialize();
    },
  },
];
