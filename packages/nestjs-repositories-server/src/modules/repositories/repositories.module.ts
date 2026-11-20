import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectRepositoriesModule } from '../project-repositories/project-repositories.module.ts';
import { RepositoriesRepository } from './repositories.repository.ts';
import { Repository } from './repository.entity.ts';

/**
 * @description Registers {@link Repository} on the default connection and provides
 * {@link RepositoriesRepository}.
 * @public
 */
@Module({
  exports: [RepositoriesRepository],
  imports: [ProjectRepositoriesModule, TypeOrmModule.forFeature([Repository])],
  providers: [RepositoriesRepository],
})
export class RepositoriesModule {}
