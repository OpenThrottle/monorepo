/**
 * @description GraphQL module for the plan inbox: registers PlanMessagesResolver, importing
 * NestjsRepositoriesModule for PlanMessagesService and GlobalClsModule for the request identity
 * used to stamp message authorship.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { PlanMessagesResolver } from './plan-messages.resolver.ts';

@Module({
  imports: [GlobalClsModule, NestjsRepositoriesModule],
  providers: [PlanMessagesResolver],
})
export class PlanMessagesGraphqlModule {}
