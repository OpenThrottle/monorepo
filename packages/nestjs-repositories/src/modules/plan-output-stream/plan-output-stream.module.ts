import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PlanOutputStreamChunk } from './plan-output-stream.entity';
import { PlanOutputStreamService } from './plan-output-stream.service';

@Module({
  controllers: [],
  exports: [PlanOutputStreamService],
  imports: [LoggerModule, TypeOrmModule.forFeature([PlanOutputStreamChunk])],
  providers: [PlanOutputStreamService],
})
export class PlanOutputStreamModule {}
