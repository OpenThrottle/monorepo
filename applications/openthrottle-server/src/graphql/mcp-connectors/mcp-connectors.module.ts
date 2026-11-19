/**
 * @description GraphQL module for the MCP connectors catalog + user connections (settings:* permissions).
 */

import { Module } from '@nestjs/common';
import {
  McpConnectorConnectionsModule,
  NestjsRepositoriesServerModule,
  RolesModule,
} from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { McpConnectorsResolver } from './mcp-connectors.resolver.ts';

@Module({
  imports: [
    RolesModule,
    McpConnectorConnectionsModule,
    NestjsRepositoriesServerModule,
  ],
  providers: [GqlPermissionsGuard, McpConnectorsResolver],
})
export class McpConnectorsGraphqlModule {}
