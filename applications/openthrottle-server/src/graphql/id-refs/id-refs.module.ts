/**
 * @description GraphQL feature module for id refs (`resolveIdRef`). Imports
 * NestjsRepositoriesModule for PlansService and TasksService.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { IdRefsResolver } from './id-refs.resolver.ts';
import { IdRefsService } from './id-refs.service.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [IdRefsResolver, IdRefsService],
})
export class IdRefsGraphqlModule {}
