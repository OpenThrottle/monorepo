/**
 * @description GraphQL module for the workstream timeline. Its raw SQL runs through the
 * default DataSource, which needs no module import.
 */

import { Module } from '@nestjs/common';

import { TimelineResolver } from './timeline.resolver.ts';

@Module({
  providers: [TimelineResolver],
})
export class TimelineGraphqlModule {}
