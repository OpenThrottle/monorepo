/**
 * @description GraphQL module for the workstream timeline. Imports
 * NestjsRepositoriesModule for PlansService (raw SQL), the same dependency the
 * activity module it extends uses.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { TimelineResolver } from './timeline.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [TimelineResolver],
})
export class TimelineGraphqlModule {}
