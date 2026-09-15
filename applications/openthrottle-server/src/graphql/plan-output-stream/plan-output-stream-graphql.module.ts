/**
 * @description GraphQL module that registers PlanOutputStreamResolver and PlanOutputStreamLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for PlanOutputStreamService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanOutputStreamResolver } from './plan-output-stream.resolver.ts';
import { PlanOutputStreamFieldsResolver } from './plan-output-stream-fields.resolver.ts';
import { PlanOutputStreamLoaders } from './plan-output-stream-loaders.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [
    PlanOutputStreamFieldsResolver,
    PlanOutputStreamLoaders,
    PlanOutputStreamResolver,
  ],
})
export class PlanOutputStreamGraphqlModule {}
