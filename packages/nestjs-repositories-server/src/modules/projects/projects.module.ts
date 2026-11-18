import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Project } from './project.entity.ts';
import { ProjectsRepository } from './projects.repository.ts';

/**
 * @description Registers {@link Project} on the default connection and provides
 * {@link ProjectsRepository}.
 * @public
 */
@Module({
  exports: [ProjectsRepository],
  imports: [TypeOrmModule.forFeature([Project])],
  providers: [ProjectsRepository],
})
export class ProjectsModule {}
