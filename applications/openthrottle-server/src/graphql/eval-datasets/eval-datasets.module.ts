/**
 * @description GraphQL module for eval datasets: registers EvalDatasetsResolver, importing
 * AgentTrajectoriesModule, EvalCasesModule and EvalDatasetsModule for the repositories and
 * GlobalClsModule for the request identity used to stamp the creator.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import {
  AgentTrajectoriesModule,
  EvalCasesModule,
  EvalDatasetsModule,
} from '@openthrottle/nestjs-repositories-server';

import { EvalDatasetsResolver } from './eval-datasets.resolver.ts';

@Module({
  imports: [
    AgentTrajectoriesModule,
    EvalCasesModule,
    EvalDatasetsModule,
    GlobalClsModule,
  ],
  providers: [EvalDatasetsResolver],
})
export class EvalDatasetsGraphqlModule {}
