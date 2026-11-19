import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectTag } from './project-tag.entity.ts';
import { ProjectTagsRepository } from './project-tags.repository.ts';

/**
 * @description Registers {@link ProjectTag} on the default connection and provides
 * {@link ProjectTagsRepository}.
 * @public
 */
@Module({
  exports: [ProjectTagsRepository],
  imports: [TypeOrmModule.forFeature([ProjectTag])],
  providers: [ProjectTagsRepository],
})
export class ProjectTagsModule {}
