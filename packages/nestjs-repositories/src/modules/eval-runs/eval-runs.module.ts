import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { EvalGrade } from './eval-grade.entity.ts';
import { EvalRun } from './eval-run.entity.ts';
import { EvalRunsService } from './eval-runs.service.ts';
import { EvalTrial } from './eval-trial.entity.ts';

@Module({
  controllers: [],
  exports: [EvalRunsService],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([EvalGrade, EvalRun, EvalTrial]),
  ],
  providers: [EvalRunsService],
})
export class EvalRunsModule {}
