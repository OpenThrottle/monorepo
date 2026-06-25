import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { getTypeormConfig } from '../../nestjs-typeorm.config';
import { DATA_SOURCE } from './database.constants';

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
        entities: [__dirname + '/../**/*.entity.js'],
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
