import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectRepositoriesRepository } from './project-repositories.repository.ts';
import { ProjectRepository } from './project-repository.entity.ts';

/**
 * @description Registers {@link ProjectRepository} on the default connection and provides
 * {@link ProjectRepositoriesRepository}.
 * @public
 */
@Module({
  exports: [ProjectRepositoriesRepository],
  imports: [TypeOrmModule.forFeature([ProjectRepository])],
  providers: [ProjectRepositoriesRepository],
})
export class ProjectRepositoriesModule {}
