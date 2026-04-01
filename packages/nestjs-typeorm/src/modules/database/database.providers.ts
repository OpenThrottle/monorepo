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
    provide: DATA_SOURCE,
    useFactory: async () => {
      const config = getTypeormConfig();
      const dataSource = new DataSource({
        database: config.POSTGRES_DB,
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        host: config.POSTGRES_HOST,
        migrations: [config.POSTGRES_PATH_MIGRATIONS],
        password: config.POSTGRES_PASSWORD,
        port: Number(config.POSTGRES_PORT),
        synchronize: process.env.NODE_ENV === 'development',
        type: 'postgres',
        username: config.POSTGRES_USER,
      });

      return dataSource.initialize();
    },
  },
];
