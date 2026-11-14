/**
 * @description GraphQL feature module for serverInfo.
 */

import { Module } from '@nestjs/common';

import { ServerInfoResolver } from './server-info.resolver.ts';
import { ServerInfoService } from './server-info.service.ts';

@Module({
  exports: [ServerInfoService],
  providers: [ServerInfoResolver, ServerInfoService],
})
export class ServerInfoGraphqlModule {}
