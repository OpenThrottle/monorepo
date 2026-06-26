import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestjsMcpDeveloperBootstrapOptions } from './nestjs-openthrottle-mcp-bootstrap-options.interface.ts';
import { NestjsMcpDeveloperModule } from './nestjs-openthrottle-mcp.module.ts';

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
