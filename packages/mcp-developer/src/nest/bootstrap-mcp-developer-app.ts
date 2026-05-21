import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestjsMcpDeveloperBootstrapOptions } from './nestjs-mcp-developer-bootstrap-options.interface.js';
import { NestjsMcpDeveloperModule } from './nestjs-mcp-developer.module.js';

/**
 * @description Creates a Nest application context so {@link NestjsMcpDeveloperModule} and `@rekog/mcp-nest` STDIO wiring run the developer MCP surface (same tools/resources as the legacy stdio server).
 */
export async function bootstrapMcpDeveloperApp(
  options: NestjsMcpDeveloperBootstrapOptions,
): Promise<void> {
  @Module({
    imports: [NestjsMcpDeveloperModule.forRoot(options)],
  })
  class McpDeveloperRootModule {}

  await NestFactory.createApplicationContext(McpDeveloperRootModule, {
    logger: false,
  });
}
