import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PlansModule } from '../plans/plans.module';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';

@Module({
  controllers: [],
  exports: [TasksService],
  imports: [LoggerModule, PlansModule, TypeOrmModule.forFeature([Task])],
  providers: [TasksService],
})
export class TasksModule {}
