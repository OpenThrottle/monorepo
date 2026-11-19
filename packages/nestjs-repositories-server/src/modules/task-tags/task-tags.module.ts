import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TaskTag } from './task-tag.entity.ts';
import { TaskTagsRepository } from './task-tags.repository.ts';

/**
 * @description Registers {@link TaskTag} on the default connection and provides
 * {@link TaskTagsRepository}.
 * @public
 */
@Module({
  exports: [TaskTagsRepository],
  imports: [TypeOrmModule.forFeature([TaskTag])],
  providers: [TaskTagsRepository],
})
export class TaskTagsModule {}
