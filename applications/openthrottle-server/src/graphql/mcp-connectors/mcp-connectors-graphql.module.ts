/**
 * @description GraphQL module for the MCP connectors catalog + user connections (settings:* permissions).
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { McpConnectorsResolver } from './mcp-connectors.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [GqlPermissionsGuard, McpConnectorsResolver],
})
export class McpConnectorsGraphqlModule {}
