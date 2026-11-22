import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectRun } from './project-run.entity.ts';
import { ProjectRunsRepository } from './project-runs.repository.ts';

/**
 * @description Registers {@link ProjectRun} on the default connection and provides
 * {@link ProjectRunsRepository}.
 * @public
 */
@Module({
  exports: [ProjectRunsRepository],
  imports: [TypeOrmModule.forFeature([ProjectRun])],
  providers: [ProjectRunsRepository],
})
export class ProjectRunsModule {}
