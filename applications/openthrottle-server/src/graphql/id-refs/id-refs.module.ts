/**
 * @description GraphQL feature module for id refs (`resolveIdRef`). Imports
 * the plans and tasks table modules for PlansRepository and TasksRepository.
 */

import { Module } from '@nestjs/common';
import {
  PlansModule,
  TasksModule,
} from '@openthrottle/nestjs-repositories-server';

import { IdRefsResolver } from './id-refs.resolver.ts';
import { IdRefsService } from './id-refs.service.ts';

@Module({
  imports: [PlansModule, TasksModule],
  providers: [IdRefsResolver, IdRefsService],
})
export class IdRefsGraphqlModule {}
