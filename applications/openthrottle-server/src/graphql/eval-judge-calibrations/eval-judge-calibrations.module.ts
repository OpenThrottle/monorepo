/**
 * @description GraphQL module for judge calibrations: registers EvalJudgeCalibrationsResolver,
 * importing EvalJudgeCalibrationsModule and EvalRunsModule for the repositories and
 * GlobalClsModule for the request identity used to stamp the creator.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import {
  EvalJudgeCalibrationsModule,
  EvalRunsModule,
} from '@openthrottle/nestjs-repositories-server';

import { EvalJudgeCalibrationsResolver } from './eval-judge-calibrations.resolver.ts';

@Module({
  imports: [EvalJudgeCalibrationsModule, EvalRunsModule, GlobalClsModule],
  providers: [EvalJudgeCalibrationsResolver],
})
export class EvalJudgeCalibrationsGraphqlModule {}
