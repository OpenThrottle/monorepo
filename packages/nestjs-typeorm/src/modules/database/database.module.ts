import { Module } from '@nestjs/common';

import { databaseProviders } from './database.providers.ts';

@Module({
  exports: [...databaseProviders],
  providers: [...databaseProviders],
})
export class DatabaseModule {}
