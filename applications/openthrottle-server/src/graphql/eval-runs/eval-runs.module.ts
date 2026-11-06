/**
 * @description GraphQL module for eval runs, trials and grades: registers EvalRunsResolver and
 * EvalTrialsResolver, importing NestjsRepositoriesModule for the services and GlobalClsModule for
 * the request identity used to stamp the run creator.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { EvalRunsResolver } from './eval-runs.resolver.ts';
import { EvalTrialsResolver } from './eval-trials/eval-trials.resolver.ts';

@Module({
  imports: [GlobalClsModule, NestjsRepositoriesModule],
  providers: [EvalRunsResolver, EvalTrialsResolver],
})
export class EvalRunsGraphqlModule {}
