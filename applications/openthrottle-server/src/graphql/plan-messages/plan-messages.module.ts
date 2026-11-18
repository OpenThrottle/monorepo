/**
 * @description GraphQL module for the plan inbox: registers PlanMessagesResolver, importing
 * PlanMessagesModule for PlanMessagesRepository and GlobalClsModule for the request identity
 * used to stamp message authorship.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { PlanMessagesModule } from '@openthrottle/nestjs-repositories-server';

import { PlanMessagesResolver } from './plan-messages.resolver.ts';

@Module({
  imports: [GlobalClsModule, PlanMessagesModule],
  providers: [PlanMessagesResolver],
})
export class PlanMessagesGraphqlModule {}
