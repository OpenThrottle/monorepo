/**
 * @description GraphQL module for eval datasets: registers EvalDatasetsResolver, importing
 * NestjsRepositoriesModule for the services and GlobalClsModule for the request identity used to
 * stamp the creator.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { EvalDatasetsResolver } from './eval-datasets.resolver.ts';

@Module({
  imports: [GlobalClsModule, NestjsRepositoriesModule],
  providers: [EvalDatasetsResolver],
})
export class EvalDatasetsGraphqlModule {}
