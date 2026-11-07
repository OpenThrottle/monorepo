import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { EvalCase } from '../eval-datasets/eval-case.entity.ts';
import { EvalHumanLabel } from '../eval-human-labels/eval-human-label.entity.ts';
import { EvalGrade } from '../eval-runs/eval-grade.entity.ts';
import { EvalTrial } from '../eval-runs/eval-trial.entity.ts';
import { EvalJudgeCalibration } from './eval-judge-calibration.entity.ts';
import { EvalJudgeCalibrationsService } from './eval-judge-calibrations.service.ts';

@Module({
  controllers: [],
  exports: [EvalJudgeCalibrationsService],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([
      EvalCase,
      EvalGrade,
      EvalHumanLabel,
      EvalJudgeCalibration,
      EvalTrial,
    ]),
  ],
  providers: [EvalJudgeCalibrationsService],
})
export class EvalJudgeCalibrationsModule {}
