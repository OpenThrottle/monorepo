import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EvalCasesModule } from '../eval-cases/eval-cases.module.ts';
import { EvalGradesModule } from '../eval-grades/eval-grades.module.ts';
import { EvalHumanLabelsModule } from '../eval-human-labels/eval-human-labels.module.ts';
import { EvalTrialsModule } from '../eval-trials/eval-trials.module.ts';
import { EvalJudgeCalibration } from './eval-judge-calibration.entity.ts';
import { EvalJudgeCalibrationsRepository } from './eval-judge-calibrations.repository.ts';

/**
 * @description Registers {@link EvalJudgeCalibration} on the default connection and provides
 * {@link EvalJudgeCalibrationsRepository}, which pairs judge grades with human labels through the
 * trial, grade, case and label repositories.
 * @public
 */
@Module({
  exports: [EvalJudgeCalibrationsRepository],
  imports: [
    EvalCasesModule,
    EvalGradesModule,
    EvalHumanLabelsModule,
    EvalTrialsModule,
    TypeOrmModule.forFeature([EvalJudgeCalibration]),
  ],
  providers: [EvalJudgeCalibrationsRepository],
})
export class EvalJudgeCalibrationsModule {}
