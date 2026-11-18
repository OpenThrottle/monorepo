import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Task } from './task.entity.ts';
import { TasksRepository } from './tasks.repository.ts';

/**
 * @description Registers {@link Task} on the default connection and provides
 * {@link TasksRepository}.
 * @public
 */
@Module({
  exports: [TasksRepository],
  imports: [TypeOrmModule.forFeature([Task])],
  providers: [TasksRepository],
})
export class TasksModule {}
