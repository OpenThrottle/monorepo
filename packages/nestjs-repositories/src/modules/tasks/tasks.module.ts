import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Task } from './task.entity';
import { TasksService } from './tasks.service';

@Module({
  controllers: [],
  exports: [TasksService],
  imports: [LoggerModule, TypeOrmModule.forFeature([Task])],
  providers: [TasksService],
})
export class TasksModule {}
