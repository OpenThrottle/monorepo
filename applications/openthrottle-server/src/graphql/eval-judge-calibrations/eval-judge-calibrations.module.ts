/**
 * @description GraphQL module for judge calibrations: registers EvalJudgeCalibrationsResolver,
 * importing NestjsRepositoriesModule for the services and GlobalClsModule for the request identity
 * used to stamp the creator.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { EvalJudgeCalibrationsResolver } from './eval-judge-calibrations.resolver.ts';

@Module({
  imports: [GlobalClsModule, NestjsRepositoriesModule],
  providers: [EvalJudgeCalibrationsResolver],
})
export class EvalJudgeCalibrationsGraphqlModule {}
