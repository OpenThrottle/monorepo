/**
 * @description GraphQL module for human trajectory labels: registers EvalHumanLabelsResolver,
 * importing NestjsRepositoriesModule for EvalHumanLabelsService and GlobalClsModule for the
 * request identity used to stamp the rater.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { EvalHumanLabelsResolver } from './eval-human-labels.resolver.ts';

@Module({
  imports: [GlobalClsModule, NestjsRepositoriesModule],
  providers: [EvalHumanLabelsResolver],
})
export class EvalHumanLabelsGraphqlModule {}
