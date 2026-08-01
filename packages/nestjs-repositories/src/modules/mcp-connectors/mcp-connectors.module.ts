/**
 * @description NestJS module for MCP connector connection state.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { McpConnectorConnection } from './mcp-connector-connection.entity';
import { McpConnectorsService } from './mcp-connectors.service';

@Module({
  controllers: [],
  exports: [McpConnectorsService, TypeOrmModule],
  imports: [LoggerModule, TypeOrmModule.forFeature([McpConnectorConnection])],
  providers: [McpConnectorsService],
})
export class McpConnectorsModule {}
