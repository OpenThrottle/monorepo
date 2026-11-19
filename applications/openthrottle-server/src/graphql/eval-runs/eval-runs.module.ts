/**
 * @description GraphQL module for eval runs, trials and grades: registers EvalRunsResolver and
 * EvalTrialsResolver, importing the dataset, grade, human label, run and trial repository modules
 * and GlobalClsModule for the request identity used to stamp the run creator.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import {
  EvalDatasetsModule,
  EvalGradesModule,
  EvalHumanLabelsModule,
  EvalRunsModule,
  EvalTrialsModule,
} from '@openthrottle/nestjs-repositories-server';

import { EvalRunsResolver } from './eval-runs.resolver.ts';
import { EvalTrialsResolver } from './eval-trials/eval-trials.resolver.ts';

@Module({
  imports: [
    EvalDatasetsModule,
    EvalGradesModule,
    EvalHumanLabelsModule,
    EvalRunsModule,
    EvalTrialsModule,
    GlobalClsModule,
  ],
  providers: [EvalRunsResolver, EvalTrialsResolver],
})
export class EvalRunsGraphqlModule {}
