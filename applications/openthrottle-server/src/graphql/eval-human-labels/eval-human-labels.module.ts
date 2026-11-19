/**
 * @description GraphQL module for human trajectory labels: registers EvalHumanLabelsResolver,
 * importing EvalHumanLabelsModule for EvalHumanLabelsRepository and GlobalClsModule for the
 * request identity used to stamp the rater.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { EvalHumanLabelsModule } from '@openthrottle/nestjs-repositories-server';

import { EvalHumanLabelsResolver } from './eval-human-labels.resolver.ts';

@Module({
  imports: [EvalHumanLabelsModule, GlobalClsModule],
  providers: [EvalHumanLabelsResolver],
})
export class EvalHumanLabelsGraphqlModule {}
