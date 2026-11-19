/**
 * @description GraphQL module for eval reports: registers EvalReportsResolver, importing
 * the case, dataset, grade, judge calibration, run and trial repository modules.
 */

import { Module } from '@nestjs/common';
import {
  EvalCasesModule,
  EvalDatasetsModule,
  EvalGradesModule,
  EvalJudgeCalibrationsModule,
  EvalRunsModule,
  EvalTrialsModule,
} from '@openthrottle/nestjs-repositories-server';

import { EvalReportsResolver } from './eval-reports.resolver.ts';

@Module({
  imports: [
    EvalCasesModule,
    EvalDatasetsModule,
    EvalGradesModule,
    EvalJudgeCalibrationsModule,
    EvalRunsModule,
    EvalTrialsModule,
  ],
  providers: [EvalReportsResolver],
})
export class EvalReportsGraphqlModule {}
