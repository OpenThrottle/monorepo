import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { PlanRun } from './plan-run.entity';
import { PlanRunsService } from './plan-runs.service';

@Module({
  controllers: [],
  exports: [PlanRunsService],
  imports: [LoggerModule, TypeOrmModule.forFeature([PlanRun])],
  providers: [PlanRunsService],
})
export class PlanRunsModule {}
