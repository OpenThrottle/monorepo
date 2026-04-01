/**
 * @description GraphQL module that registers PlanOutputStreamResolver and imports NestjsRepositoriesModule for PlanOutputStreamService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { PlanOutputStreamResolver } from './plan-output-stream.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [PlanOutputStreamResolver],
})
export class PlanOutputStreamGraphqlModule {}
