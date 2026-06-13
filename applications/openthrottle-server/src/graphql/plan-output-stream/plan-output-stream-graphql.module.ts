/**
 * @description GraphQL module that registers PlanOutputStreamResolver and PlanOutputStreamLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for PlanOutputStreamService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { PlanOutputStreamLoaders } from './plan-output-stream-loaders';
import { PlanOutputStreamResolver } from './plan-output-stream.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [PlanOutputStreamLoaders, PlanOutputStreamResolver],
})
export class PlanOutputStreamGraphqlModule {}
