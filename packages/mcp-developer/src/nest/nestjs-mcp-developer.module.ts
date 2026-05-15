import { DynamicModule, Module } from '@nestjs/common';
import type { McpOptions } from '@rekog/mcp-nest';
import { McpModule, McpTransportType } from '@rekog/mcp-nest';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { McpDeveloperMcpSurface } from './mcp-developer-mcp-surface.js';
import type { NestjsMcpDeveloperBootstrapOptions } from './nestjs-mcp-developer-bootstrap-options.interface.js';
import { NestjsMcpDeveloperService } from './nestjs-mcp-developer.service.js';

const buildMcpRootOptions = (
  options: NestjsMcpDeveloperBootstrapOptions,
): McpOptions => ({
  apiPrefix: options.apiPrefix,
  capabilities: options.capabilities,
  description: options.description,
  instructions: options.instructions,
  name: options.name,
  title: options.title,
  transport: options.transport ?? McpTransportType.STDIO,
  version: options.version,
});

/**
 * @description OpenThrottle Nest module that composes {@link LoggerModule} and `@rekog/mcp-nest` {@link McpModule} for the developer MCP surface.
 */
@Module({})
export class NestjsMcpDeveloperModule {
  /**
   * @description Registers structured logging and MCP server wiring. Defaults to STDIO; set `transport` for SSE or streamable HTTP when hosting in-process.
   */
  static forRoot(options: NestjsMcpDeveloperBootstrapOptions): DynamicModule {
    const serverName = options.name;
    return {
      exports: [McpModule, McpDeveloperMcpSurface, NestjsMcpDeveloperService],
      imports: [
        LoggerModule,
        McpModule.forRoot(buildMcpRootOptions(options)),
        McpModule.forFeature([McpDeveloperMcpSurface], serverName),
      ],
      module: NestjsMcpDeveloperModule,
      providers: [McpDeveloperMcpSurface, NestjsMcpDeveloperService],
    };
  }
}
