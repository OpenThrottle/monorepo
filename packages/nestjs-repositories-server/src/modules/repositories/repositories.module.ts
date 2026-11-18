import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RepositoriesRepository } from './repositories.repository.ts';
import { Repository } from './repository.entity.ts';

/**
 * @description Registers {@link Repository} on the default connection and provides
 * {@link RepositoriesRepository}.
 * @public
 */
@Module({
  exports: [RepositoriesRepository],
  imports: [TypeOrmModule.forFeature([Repository])],
  providers: [RepositoriesRepository],
})
export class RepositoriesModule {}
