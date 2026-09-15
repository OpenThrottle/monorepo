import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { PlansModule } from '../plans/plans.module.ts';
import { Task } from './task.entity.ts';
import { TasksService } from './tasks.service.ts';

@Module({
  controllers: [],
  exports: [TasksService],
  imports: [LoggerModule, PlansModule, TypeOrmModule.forFeature([Task])],
  providers: [TasksService],
})
export class TasksModule {}
