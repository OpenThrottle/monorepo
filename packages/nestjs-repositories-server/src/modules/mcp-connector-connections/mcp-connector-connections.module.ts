import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { McpConnectorConnection } from './mcp-connector-connection.entity.ts';
import { McpConnectorConnectionsRepository } from './mcp-connector-connections.repository.ts';

/**
 * @description Registers {@link McpConnectorConnection} on the default connection and provides
 * {@link McpConnectorConnectionsRepository}.
 * @public
 */
@Module({
  exports: [McpConnectorConnectionsRepository],
  imports: [TypeOrmModule.forFeature([McpConnectorConnection])],
  providers: [McpConnectorConnectionsRepository],
})
export class McpConnectorConnectionsModule {}
