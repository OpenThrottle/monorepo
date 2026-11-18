/**
 * @description GraphQL module that registers PlanOutputStreamResolver and PlanOutputStreamLoaders (request-scoped DataLoaders) and imports the plan output stream and plans table modules for PlanOutputStreamRepository and PlansRepository.
 */

import { Module } from '@nestjs/common';
import {
  PlanOutputStreamModule,
  PlansModule,
} from '@openthrottle/nestjs-repositories-server';

import { PlanOutputStreamFieldsResolver } from './fields/fields.resolver.ts';
import { PlanOutputStreamLoaders } from './loaders/loaders.service.ts';
import { PlanOutputStreamResolver } from './plan-output-stream.resolver.ts';

@Module({
  imports: [PlanOutputStreamModule, PlansModule],
  providers: [
    PlanOutputStreamFieldsResolver,
    PlanOutputStreamLoaders,
    PlanOutputStreamResolver,
  ],
})
export class PlanOutputStreamGraphqlModule {}
