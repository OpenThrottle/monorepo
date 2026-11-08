/**
 * @description GraphQL module that registers PlanOutputStreamResolver and PlanOutputStreamLoaders (request-scoped DataLoaders) and imports NestjsRepositoriesModule for PlanOutputStreamService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanOutputStreamFieldsResolver } from './fields/fields.resolver.ts';
import { PlanOutputStreamLoaders } from './loaders/loaders.service.ts';
import { PlanOutputStreamResolver } from './plan-output-stream.resolver.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [
    PlanOutputStreamFieldsResolver,
    PlanOutputStreamLoaders,
    PlanOutputStreamResolver,
  ],
})
export class PlanOutputStreamGraphqlModule {}
